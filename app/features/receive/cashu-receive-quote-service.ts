import {
  type CashuWallet,
  MintOperationError,
  MintQuoteState,
  OutputData,
  type Proof,
  type Token,
} from '@cashu/cashu-ts';
import { HARDENED_OFFSET } from '@scure/bip32';
import {
  CashuErrorCodes,
  amountsFromOutputData,
  getCashuUnit,
  getCashuWallet,
  getCrossMintQuotesWithinTargetAmount,
} from '~/lib/cashu';
import type { Money } from '~/lib/money';
import type { CashuAccount } from '../accounts/account';
import {
  BASE_CASHU_LOCKING_DERIVATION_PATH,
  type CashuCryptography,
  tokenToMoney,
  useCashuCryptography,
} from '../shared/cashu';
import { derivePublicKey } from '../shared/cryptography';
import type { CashuReceiveQuote } from './cashu-receive-quote';
import {
  type CashuReceiveQuoteRepository,
  useCashuReceiveQuoteRepository,
} from './cashu-receive-quote-repository';

export class CashuReceiveQuoteService {
  constructor(
    private readonly cryptography: CashuCryptography,
    private readonly cashuReceiveQuoteRepository: CashuReceiveQuoteRepository,
  ) {}

  /**
   * Creates a new cashu receive quote used for receiving via a bolt11 payment request.
   * @returns The created cashu receive quote with the bolt11 invoice to pay.
   */
  async createLightningQuote({
    userId,
    account,
    amount,
    description,
  }: {
    /**
     * The id of the user that will receive the money.
     */
    userId: string;
    /**
     * The cashu account to which the money will be received.
     */
    account: CashuAccount;
    /**
     * The amount to receive.
     */
    amount: Money;
    /**
     * The description of the receive request.
     */
    description?: string;
  }): Promise<CashuReceiveQuote> {
    const cashuUnit = getCashuUnit(amount.currency);

    const wallet = getCashuWallet(account.mintUrl, {
      unit: cashuUnit,
    });

    const { lockingPublicKey, fullLockingDerivationPath } =
      await this.deriveNut20LockingPublicKey();

    const mintQuoteResponse = await wallet.createLockedMintQuote(
      amount.toNumber(cashuUnit),
      lockingPublicKey,
      description,
    );

    const expiresAt = new Date(mintQuoteResponse.expiry * 1000).toISOString();

    const cashuReceiveQuote = await this.cashuReceiveQuoteRepository.create({
      accountId: account.id,
      userId,
      amount,
      description,
      quoteId: mintQuoteResponse.quote,
      expiresAt,
      state: mintQuoteResponse.state as CashuReceiveQuote['state'],
      paymentRequest: mintQuoteResponse.request,
      lockingDerivationPath: fullLockingDerivationPath,
      receiveType: 'LIGHTNING',
    });

    return cashuReceiveQuote;
  }

  /**
   * Claims a token from one mint to another by creating a new cashu receive quote and melting the token.
   */
  async meltTokenToCashuAccount({
    userId,
    token,
    account,
  }: {
    /**
     * The id of the user that will receive the money.
     */
    userId: string;
    /**
     * The token to melt.
     */
    token: Token;
    /**
     * The cashu account to which the token will be melted.
     */
    account: CashuAccount;
  }): Promise<CashuReceiveQuote> {
    const tokenAmount = tokenToMoney(token);
    const fromCashuUnit = getCashuUnit(tokenAmount.currency);
    const toCashuUnit = getCashuUnit(account.currency);

    if (account.mintUrl === token.mint && fromCashuUnit === toCashuUnit) {
      throw new Error(
        'Must melt token to a different mint or currency than source',
      );
    }

    const sourceWallet = getCashuWallet(token.mint, {
      unit: fromCashuUnit,
    });
    const destinationWallet = getCashuWallet(account.mintUrl, {
      unit: toCashuUnit,
    });

    const { lockingPublicKey, fullLockingDerivationPath } =
      await this.deriveNut20LockingPublicKey();

    const quotes = await getCrossMintQuotesWithinTargetAmount({
      sourceWallet,
      destinationWallet,
      targetAmount: tokenAmount,
      nut20LockingPublicKey: lockingPublicKey,
    });

    const expiresAt = new Date(quotes.mintQuote.expiry * 1000).toISOString();

    const cashuReceiveQuote = await this.cashuReceiveQuoteRepository.create({
      accountId: account.id,
      userId,
      amount: quotes.amountToMint,
      quoteId: quotes.mintQuote.quote,
      expiresAt,
      state: quotes.mintQuote.state as CashuReceiveQuote['state'],
      paymentRequest: quotes.mintQuote.request,
      lockingDerivationPath: fullLockingDerivationPath,
      receiveType: 'TOKEN',
    });

    try {
      await sourceWallet.meltProofs(quotes.meltQuote, token.proofs);
    } catch (error) {
      if (
        error instanceof MintOperationError &&
        error.code === CashuErrorCodes.LIGHTNING_PAYMENT_FAILED
      ) {
        await this.cashuReceiveQuoteRepository.fail({
          id: cashuReceiveQuote.id,
          version: cashuReceiveQuote.version,
          reason: error.message,
        });
      }
      throw error;
    }

    return cashuReceiveQuote;
  }

  /**
   * Expires the cashu receive quote by setting the state to EXPIRED.
   */
  async expire(quote: CashuReceiveQuote): Promise<void> {
    if (quote.state === 'EXPIRED') {
      return;
    }

    if (quote.state !== 'UNPAID') {
      throw new Error('Cannot expire quote that is not unpaid');
    }

    if (new Date(quote.expiresAt) > new Date()) {
      throw new Error('Cannot expire quote that has not expired yet');
    }

    await this.cashuReceiveQuoteRepository.expire({
      id: quote.id,
      version: quote.version,
    });
  }

  /**
   * Completes the receive quote by preparing the output data, minting the proofs, updating the quote state and account proofs.
   * @param account - The cashu account that the quote belongs to.
   * @param quote - The cashu receive quote to complete.
   */
  async completeReceive(
    account: CashuAccount,
    quote: CashuReceiveQuote,
  ): Promise<void> {
    if (quote.accountId !== account.id) {
      throw new Error('Quote does not belong to account');
    }

    if (quote.state === 'EXPIRED' || quote.state === 'COMPLETED') {
      throw new Error(
        'Cannot complete quote that is expired or already completed',
      );
    }

    const seed = await this.cryptography.getSeed();
    const cashuUnit = getCashuUnit(quote.amount.currency);

    const wallet = getCashuWallet(account.mintUrl, {
      unit: cashuUnit,
      bip39seed: seed,
    });

    const keysetId = quote.state === 'PAID' ? quote.keysetId : undefined;
    const keys = await wallet.getKeys(keysetId);
    const counter = account.keysetCounters[wallet.keysetId] ?? 0;
    const outputData = OutputData.createDeterministicData(
      quote.amount.toNumber(cashuUnit),
      seed,
      counter,
      keys,
    );
    const outputAmounts = amountsFromOutputData(outputData);

    const { updatedQuote, updatedAccount } =
      await this.cashuReceiveQuoteRepository.processPayment({
        quoteId: quote.id,
        quoteVersion: quote.version,
        keysetId: wallet.keysetId,
        keysetCounter: counter,
        outputAmounts,
        accountVersion: account.version,
      });

    const mintedProofs = await this.mintProofs(
      wallet,
      updatedQuote,
      outputData,
    );
    const allProofs = [...updatedAccount.proofs, ...mintedProofs];

    await this.cashuReceiveQuoteRepository.completeReceive({
      quoteId: quote.id,
      quoteVersion: updatedQuote.version,
      proofs: allProofs,
      accountVersion: updatedAccount.version,
    });
  }

  private async mintProofs(
    wallet: CashuWallet,
    quote: CashuReceiveQuote,
    outputData: OutputData[],
  ): Promise<Proof[]> {
    if (quote.state !== 'PAID') {
      throw new Error(
        'Invalid quote state. Quote must be in PAID state to mint proofs.',
      );
    }

    try {
      const cashuUnit = getCashuUnit(quote.amount.currency);

      const unlockingKey = await this.cryptography.getPrivateKey(
        quote.lockingDerivationPath,
      );

      const proofs = await wallet.mintProofs(
        quote.amount.toNumber(cashuUnit),
        // NOTE: cashu-ts makes us pass the mint quote response instead of just the quote id
        // if we want to use the private key to create a signature. However, the implementation
        // only ends up using the quote id.
        {
          quote: quote.quoteId,
          request: quote.paymentRequest,
          state: MintQuoteState.PAID,
          expiry: Math.floor(new Date(quote.expiresAt).getTime() / 1000),
        },
        {
          keysetId: quote.keysetId,
          outputData,
          privateKey: unlockingKey,
        },
      );

      return proofs;
    } catch (error) {
      if (
        error instanceof MintOperationError &&
        ([
          CashuErrorCodes.OUTPUT_ALREADY_SIGNED,
          CashuErrorCodes.QUOTE_ALREADY_ISSUED,
        ].includes(error.code) ||
          // Nutshell mint implementation did not conform to the spec up until version 0.16.5 (see https://github.com/cashubtc/nutshell/pull/693)
          // so for earlier versions we need to check the message.
          error.message
            .toLowerCase()
            .includes('outputs have already been signed before') ||
          error.message.toLowerCase().includes('mint quote already issued.'))
      ) {
        const { proofs } = await wallet.restore(
          quote.keysetCounter,
          quote.outputAmounts.length,
          {
            keysetId: quote.keysetId,
          },
        );
        return proofs;
      }
      throw error;
    }
  }

  private async deriveNut20LockingPublicKey() {
    const xpub = await this.cryptography.getXpub(
      BASE_CASHU_LOCKING_DERIVATION_PATH,
    );

    const unhardenedIndex = Math.floor(
      Math.random() * (HARDENED_OFFSET - 1),
    ).toString();

    const lockingKey = derivePublicKey(xpub, `m/${unhardenedIndex}`);

    return {
      lockingPublicKey: lockingKey,
      fullLockingDerivationPath: `${BASE_CASHU_LOCKING_DERIVATION_PATH}/${unhardenedIndex}`,
    };
  }
}

export function useCashuReceiveQuoteService() {
  const cryptography = useCashuCryptography();
  const cashuReceiveQuoteRepository = useCashuReceiveQuoteRepository();
  return new CashuReceiveQuoteService(
    cryptography,
    cashuReceiveQuoteRepository,
  );
}

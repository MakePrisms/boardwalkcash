import {
  type CashuWallet,
  MintOperationError,
  type MintQuoteResponse,
  MintQuoteState,
  OutputData,
  type Proof,
} from '@cashu/cashu-ts';
import { HARDENED_OFFSET } from '@scure/bip32';
import {
  CashuErrorCodes,
  amountsFromOutputData,
  getCashuUnit,
} from '~/lib/cashu';
import type { Money } from '~/lib/money';
import type { CashuAccount, ExtendedCashuAccount } from '../accounts/account';
import {
  BASE_CASHU_LOCKING_DERIVATION_PATH,
  type CashuCryptography,
  useCashuCryptography,
} from '../shared/cashu';
import { derivePublicKey } from '../shared/cryptography';
import type { CashuReceiveQuote } from './cashu-receive-quote';
import {
  type CashuReceiveQuoteRepository,
  useCashuReceiveQuoteRepository,
} from './cashu-receive-quote-repository';

export type CashuReceiveLightningQuote = {
  /**
   * The locked mint quote from the mint.
   */
  mintQuote: MintQuoteResponse;
  /**
   * The public key that locks the mint quote.
   */
  lockingPublicKey: string;
  /**
   * The full derivation path of the locking key. This is needed to derive the private key to unlock the mint quote.
   */
  fullLockingDerivationPath: string;
  /**
   * The expiration date of the mint quote.
   */
  expiresAt: string;
  /**
   * The amount to receive.
   */
  amount: Money;
  /**
   * The description of the receive request.
   */
  description?: string;
};

export class CashuReceiveQuoteService {
  constructor(
    private readonly cryptography: CashuCryptography,
    private readonly cashuReceiveQuoteRepository: CashuReceiveQuoteRepository,
  ) {}

  /**
   * Gets a locked mint quote response for receiving lightning payments.
   * @returns The mint quote response and related data needed to create a receive quote.
   */
  async getLightningQuote({
    account,
    amount,
    description,
  }: {
    /**
     * The cashu account to which the money will be received.
     */
    account: ExtendedCashuAccount;
    /**
     * The amount to receive.
     */
    amount: Money;
    /**
     * The description of the receive request.
     */
    description?: string;
  }): Promise<CashuReceiveLightningQuote> {
    const cashuUnit = getCashuUnit(amount.currency);

    const wallet = account.wallet;

    const { lockingPublicKey, fullLockingDerivationPath } =
      await this.deriveNut20LockingPublicKey();

    const mintQuoteResponse = await wallet.createLockedMintQuote(
      amount.toNumber(cashuUnit),
      lockingPublicKey,
      description,
    );

    const expiresAt = new Date(mintQuoteResponse.expiry * 1000).toISOString();

    return {
      mintQuote: mintQuoteResponse,
      lockingPublicKey,
      fullLockingDerivationPath,
      expiresAt,
      amount,
      description,
    };
  }

  /**
   * Creates a new cashu receive quote used for receiving via a bolt11 payment request.
   * @returns The created cashu receive quote with the bolt11 invoice to pay.
   */
  async createReceiveQuote({
    userId,
    account,
    receiveType,
    receiveQuote,
    tokenAmount,
    cashuReceiveFee,
  }: {
    /**
     * The id of the user that will receive the money.
     */
    userId: string;
    /**
     * The cashu account to which the money will be received.
     */
    account: ExtendedCashuAccount;
    /**
     * Whether this is for a regular lighting invoice or
     * melting a token to this account.
     */
    receiveType: 'LIGHTNING' | 'TOKEN';
    /**
     * The receive quote to create.
     */
    receiveQuote: CashuReceiveLightningQuote;
    /**
     * The amount of the token to receive.
     */
    tokenAmount?: Money;
    /**
     * The fee in the unit of the token that will be incurred for spending the proofs as inputs to the melt operation.
     */
    cashuReceiveFee?: number;
  }): Promise<CashuReceiveQuote> {
    const baseReceiveQuote = {
      accountId: account.id,
      userId,
      amount: receiveQuote.amount,
      description: receiveQuote.description,
      quoteId: receiveQuote.mintQuote.quote,
      expiresAt: receiveQuote.expiresAt,
      state: receiveQuote.mintQuote.state as CashuReceiveQuote['state'],
      paymentRequest: receiveQuote.mintQuote.request,
      lockingDerivationPath: receiveQuote.fullLockingDerivationPath,
    };

    if (receiveType === 'TOKEN') {
      if (!tokenAmount || cashuReceiveFee === undefined) {
        throw new Error(
          'Token amount and receive swap fee are required for token receive quotes',
        );
      }

      return this.cashuReceiveQuoteRepository.create({
        ...baseReceiveQuote,
        receiveType,
        tokenAmount,
        cashuReceiveFee,
      });
    }

    return this.cashuReceiveQuoteRepository.create({
      ...baseReceiveQuote,
      receiveType,
    });
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
    account: ExtendedCashuAccount,
    quote: CashuReceiveQuote,
  ): Promise<void> {
    if (quote.accountId !== account.id) {
      throw new Error('Quote does not belong to account');
    }

    if (quote.state === 'EXPIRED' || quote.state === 'FAILED') {
      throw new Error(
        `Cannot complete quote that is expired or failed. State: ${quote.state}`,
      );
    }

    if (quote.state === 'COMPLETED') {
      return;
    }

    const seed = await this.cryptography.getSeed();
    const cashuUnit = getCashuUnit(quote.amount.currency);

    const wallet = account.wallet;

    const keysetId = quote.state === 'PAID' ? quote.keysetId : undefined;
    const keys = await wallet.getKeys(keysetId);
    const counter =
      quote.state === 'PAID'
        ? quote.keysetCounter
        : (account.keysetCounters[wallet.keysetId] ?? 0);

    const outputData = OutputData.createDeterministicData(
      quote.amount.toNumber(cashuUnit),
      seed,
      counter,
      keys,
    );

    let currentAccount: CashuAccount = account;
    let currentQuote: CashuReceiveQuote = quote;

    if (quote.state === 'UNPAID') {
      const result = await this.cashuReceiveQuoteRepository.processPayment({
        quoteId: quote.id,
        quoteVersion: quote.version,
        keysetId: wallet.keysetId,
        keysetCounter: counter,
        outputAmounts: amountsFromOutputData(outputData),
        accountVersion: account.version,
      });

      currentAccount = result.updatedAccount;
      currentQuote = result.updatedQuote;
    }

    const mintedProofs = await this.mintProofs(
      wallet,
      currentQuote,
      outputData,
    );

    const allProofs = [...currentAccount.proofs, ...mintedProofs];

    await this.cashuReceiveQuoteRepository.completeReceive({
      quoteId: currentQuote.id,
      quoteVersion: currentQuote.version,
      proofs: allProofs,
      accountVersion: currentAccount.version,
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
      const amount = quote.amount.toNumber(cashuUnit);

      const unlockingKey = await this.cryptography.getPrivateKey(
        quote.lockingDerivationPath,
      );

      const proofs = await wallet.mintProofs(
        amount,
        // NOTE: cashu-ts makes us pass the mint quote response instead of just the quote id
        // if we want to use the private key to create a signature. However, the implementation
        // only ends up using the quote id.
        {
          quote: quote.quoteId,
          request: quote.paymentRequest,
          state: MintQuoteState.PAID,
          expiry: Math.floor(new Date(quote.expiresAt).getTime() / 1000),
          amount,
          unit: wallet.unit,
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

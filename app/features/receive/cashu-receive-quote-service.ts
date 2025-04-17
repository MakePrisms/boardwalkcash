import {
  type CashuWallet,
  MintOperationError,
  OutputData,
  type Proof,
  type SerializedBlindedMessage,
} from '@cashu/cashu-ts';
import {
  CashuErrorCodes,
  amountsFromOutputData,
  getCashuUnit,
  getCashuWallet,
} from '~/lib/cashu';
import type { Money } from '~/lib/money';
import { computeSHA256Bytes } from '~/lib/sha256';
import type { CashuAccount } from '../accounts/account';
import { type CashuCryptography, useCashuCryptography } from '../shared/cashu';
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
   * Creates a new cashu receive quote.
   * @returns The created cashu receive quote.
   */
  async create({
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

    // TODO: NUT-20 says to use different public keys for each quote for privacy reasons
    // We can't really do this for lightning address because we need OS to get the public key.
    // Can an xpub be used to derive different public keys? We could store xpub on the user
    // and then derive different public keys for each quote.
    const lockingKey = await this.cryptography.getLockingKey();

    const mintQuoteResponse = await wallet.createLockedMintQuote(
      amount.toNumber(cashuUnit),
      lockingKey,
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
    });

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
      const keyset = await wallet.getKeys(quote.keysetId);
      const blindedMessages = outputData.map((d) => d.blindedMessage);

      const { signatures } = await wallet.mint.mint({
        outputs: blindedMessages,
        quote: quote.quoteId,
        signature: await this.signMintQuote(quote.quoteId, blindedMessages),
      });

      return outputData.map((d, i) => d.toProof(signatures[i], keyset));
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

  /**
   * Concatenates the quote id and blinded messages, then signs hash.
   * @param quoteId - The id of the quote this signature is for.
   * @param blindedMessages - The blinded messages used for the outputs of the mint operation.
   * @see https://github.com/cashubtc/nuts/blob/main/20.md
   */
  private async signMintQuote(
    quoteId: string,
    blindedMessages: SerializedBlindedMessage[],
  ): Promise<string> {
    const message = await constructNUT20Message(quoteId, blindedMessages);
    return this.cryptography.signMessage(message);
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

async function constructNUT20Message(
  quote: string,
  blindedMessages: Array<SerializedBlindedMessage>,
): Promise<Uint8Array> {
  let message = quote;
  for (const blindedMessage of blindedMessages) {
    message += blindedMessage.B_;
  }
  const msgbytes = new TextEncoder().encode(message);
  return computeSHA256Bytes(msgbytes);
}

import type { Proof } from '@cashu/cashu-ts';
import type { Currency, Money } from '~/lib/money';
import type { CashuAccount } from '../accounts/account';
import { AccountRepository } from '../accounts/account-repository';
import type {
  BoardwalkDb,
  BoardwalkDbCashuReceiveQuote,
} from '../boardwalk-db/database';
import type { CashuReceiveQuote } from './cashu-receive-quote';

type Options = {
  abortSignal?: AbortSignal;
};

type Encryption = {
  encrypt: <T = unknown>(data: T) => Promise<string>;
  decrypt: <T = unknown>(data: string) => Promise<T>;
};

type CreateQuote = {
  /**
   * ID of the receiving user.
   */
  userId: string;
  /**
   * ID of the receiving account.
   */
  accountId: string;
  /**
   * Amount of the quote.
   */
  amount: Money;
  /**
   * Cashu unit of the quote.
   */
  unit: 'sat' | 'usd';
  /**
   * ID of the mint's quote. Used after the payment to exchange the quote for proofs.
   */
  quoteId: string;
  /**
   * Lightning payment request.
   */
  paymentRequest: string;
  /**
   * Expiry of the quote in ISO 8601 format.
   */
  expiresAt: string;
  /**
   * Description of the quote.
   */
  description?: string;
  /**
   * State of the quote.
   */
  state: CashuReceiveQuote['state'];
};

export class CashuReceiveQuoteRepository {
  constructor(
    private readonly db: BoardwalkDb,
    private readonly encryption: Encryption,
  ) {}

  /**
   * Creates a cashu receive quote.
   * @returns Created cashu receive quote.
   */
  async create(
    {
      userId,
      accountId,
      amount,
      unit,
      quoteId,
      paymentRequest,
      expiresAt,
      description,
      state,
    }: CreateQuote,
    options?: Options,
  ): Promise<CashuReceiveQuote> {
    const encryptedQuoteId = await this.encryption.encrypt(quoteId);

    const query = this.db
      .from('cashu_receive_quotes')
      .insert({
        user_id: userId,
        account_id: accountId,
        amount: amount.toNumber(unit),
        currency: amount.currency,
        unit,
        quote_id: encryptedQuoteId,
        payment_request: paymentRequest,
        expires_at: expiresAt,
        description,
        state,
      })
      .select();

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to create cashu receive quote', error);
    }

    return CashuReceiveQuoteRepository.toQuote(data, this.encryption.decrypt);
  }

  /**
   * Expires the cashu receive quote with the given id by deleting the quote.
   */
  async expire(
    {
      id,
      version,
    }: {
      /**
       * ID of the cashu receive quote.
       */
      id: string;
      /**
       * Version of the cashu receive quote as seen by the client. Used for optimistic concurrency control.
       */
      version: number;
    },
    options?: Options,
  ): Promise<void> {
    const query = this.db.rpc('expire_cashu_receive_quote', {
      quote_id: id,
      quote_version: version,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error } = await query;

    if (error) {
      throw new Error('Failed to expire cashu receive quote', error);
    }
  }

  /**
   * Processes the payment of the cashu receive quote with the given id.
   * Marks the quote as paid and updates the related data. It also updates the account counter for the keyset.
   */
  async processPayment(
    {
      quoteId,
      quoteVersion,
      keysetId,
      keysetCounter,
      numberOfBlindedMessages,
      accountVersion,
    }: {
      /**
       * ID of the cashu receive quote.
       */
      quoteId: string;
      /**
       * Version of the cashu receive quote as seen by the client. Used for optimistic concurrency control.
       */
      quoteVersion: number;
      /**
       * ID of the keyset used to create the blinded messages.
       */
      keysetId: string;
      /**
       * Counter value for the keyset at the time the time of quote payment.
       */
      keysetCounter: number;
      /**
       * Number of blinded messages generated for this quote.
       */
      numberOfBlindedMessages: number;
      /**
       * Version of the account as seen by the client. Used for optimistic concurrency control.
       */
      accountVersion: number;
    },
    options?: Options,
  ): Promise<{
    updatedQuote: CashuReceiveQuote;
    updatedAccount: CashuAccount;
  }> {
    const query = this.db.rpc('process_cashu_receive_quote_payment', {
      p_quote_id: quoteId,
      quote_version: quoteVersion,
      p_keyset_id: keysetId,
      p_keyset_counter: keysetCounter,
      p_number_of_blinded_messages: numberOfBlindedMessages,
      account_version: accountVersion,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to mark cashu receive quote as paid', error);
    }

    const [updatedQuote, updatedAccount] = await Promise.all([
      CashuReceiveQuoteRepository.toQuote(
        data.updated_quote as BoardwalkDbCashuReceiveQuote,
        this.encryption.decrypt,
      ),
      AccountRepository.toAccount(
        data.updated_account,
        this.encryption.decrypt,
      ),
    ]);

    return {
      updatedQuote,
      updatedAccount: updatedAccount as CashuAccount,
    };
  }

  /**
   * Completes the cashu receive quote with the given id.
   * Completing the quote means that the quote is paid and the tokens have been minted, so the quote is deleted and the account is updated with the new proofs.
   */
  async completeReceive(
    {
      quoteId,
      quoteVersion,
      proofs,
      accountVersion,
    }: {
      /**
       * ID of the cashu receive quote.
       */
      quoteId: string;
      /**
       * Version of the cashu receive quote as seen by the client. Used for optimistic concurrency control.
       */
      quoteVersion: number;
      /**
       * Proofs minted for the receive.
       */
      proofs: Proof[];
      /**
       * Version of the account as seen by the client. Used for optimistic concurrency control.
       */
      accountVersion: number;
    },
    options?: Options,
  ): Promise<void> {
    const encryptedProofs = await this.encryption.encrypt(proofs);

    // TODO: The function should also create the related history item.
    const query = this.db.rpc('complete_cashu_receive_quote', {
      p_quote_id: quoteId,
      quote_version: quoteVersion,
      proofs: encryptedProofs,
      account_version: accountVersion,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error } = await query;

    if (error) {
      throw new Error('Failed to complete cashu receive quote', error);
    }
  }

  /**
   * Gets the cashu receive quote with the given id.
   * @param id - The id of the cashu receive quote to get.
   * @returns The cashu receive quote.
   */
  async get(id: string, options?: Options): Promise<CashuReceiveQuote> {
    const query = this.db.from('cashu_receive_quotes').select().eq('id', id);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to get cashu receive quote', error);
    }

    return CashuReceiveQuoteRepository.toQuote(data, this.encryption.decrypt);
  }

  /**
   * Gets all the cashu receive quotes for the given user.
   * @param userId - The id of the user to get the cashu receive quotes for.
   * @returns The cashu receive quotes.
   */
  async getAll(
    userId: string,
    options?: Options,
  ): Promise<CashuReceiveQuote[]> {
    const query = this.db
      .from('cashu_receive_quotes')
      .select()
      .eq('user_id', userId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to get cashu receive quotes', error);
    }

    return await Promise.all(
      data.map(
        async (data) =>
          await CashuReceiveQuoteRepository.toQuote(
            data,
            this.encryption.decrypt,
          ),
      ),
    );
  }

  static async toQuote(
    data: BoardwalkDbCashuReceiveQuote,
    decryptData: Encryption['decrypt'],
  ): Promise<CashuReceiveQuote> {
    const decryptedData = {
      ...data,
      quote_id: await decryptData<string>(data.quote_id),
    };

    const commonData = {
      id: decryptedData.id,
      userId: decryptedData.user_id,
      accountId: decryptedData.account_id,
      quoteId: decryptedData.quote_id,
      amount: decryptedData.amount,
      currency: decryptedData.currency as Currency,
      unit: decryptedData.unit,
      description: decryptedData.description ?? undefined,
      createdAt: decryptedData.created_at,
      expiresAt: decryptedData.expires_at,
      paymentRequest: decryptedData.payment_request,
      version: decryptedData.version,
    };

    if (decryptedData.state === 'PAID') {
      return {
        ...commonData,
        state: 'PAID',
        keysetId: decryptedData.keyset_id ?? '',
        keysetCounter: decryptedData.keyset_counter ?? 0,
        numberOfBlindedMessages: decryptedData.number_of_blinded_messages ?? 0,
      };
    }

    return {
      ...commonData,
      state: 'UNPAID',
      keysetId: undefined,
      keysetCounter: undefined,
      numberOfBlindedMessages: undefined,
    };
  }
}

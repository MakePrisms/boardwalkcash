import type { Proof } from '@cashu/cashu-ts';
import { Money } from '~/lib/money';
import type { CashuAccount } from '../accounts/account';
import { AccountRepository } from '../accounts/account-repository';
import {
  type BoardwalkDb,
  type BoardwalkDbCashuReceiveQuote,
  boardwalkDb,
} from '../boardwalk-db/database';
import { getDefaultUnit } from '../shared/currencies';
import { useEncryption } from '../shared/encryption';
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
  /**
   * The full BIP32 derivation path used to derive the public key for locking the cashu mint quote.
   */
  lockingDerivationPath: string;
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
      quoteId,
      paymentRequest,
      expiresAt,
      description,
      state,
      lockingDerivationPath,
    }: CreateQuote,
    options?: Options,
  ): Promise<CashuReceiveQuote> {
    const unit = getDefaultUnit(amount.currency);

    const query = this.db
      .from('cashu_receive_quotes')
      .insert({
        user_id: userId,
        account_id: accountId,
        amount: amount.toNumber(unit),
        currency: amount.currency,
        unit,
        quote_id: quoteId,
        payment_request: paymentRequest,
        expires_at: expiresAt,
        description,
        state,
        locking_derivation_path: lockingDerivationPath,
      })
      .select();

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to create cashu receive quote', { cause: error });
    }

    return CashuReceiveQuoteRepository.toQuote(data);
  }

  /**
   * Expires the cashu receive quote by setting the state to EXPIRED.
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
      p_quote_id: id,
      p_quote_version: version,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error } = await query;

    if (error) {
      throw new Error('Failed to expire cashu receive quote', { cause: error });
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
      outputAmounts,
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
       * Amounts for each blinded message
       */
      outputAmounts: number[];
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
      p_quote_version: quoteVersion,
      p_keyset_id: keysetId,
      p_keyset_counter: keysetCounter,
      p_output_amounts: outputAmounts,
      p_account_version: accountVersion,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to mark cashu receive quote as paid', {
        cause: error,
      });
    }

    const updatedQuote = CashuReceiveQuoteRepository.toQuote(
      data.updated_quote,
    );
    const updatedAccount = await AccountRepository.toAccount(
      data.updated_account,
      this.encryption.decrypt,
    );

    return {
      updatedQuote,
      updatedAccount: updatedAccount as CashuAccount,
    };
  }

  /**
   * Completes the cashu receive quote with the given id.
   * Completing the quote means that the quote is paid and the tokens have been minted, so the quote state is updated to COMPLETED and the account is updated with the new proofs.
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
      p_quote_version: quoteVersion,
      p_proofs: encryptedProofs,
      p_account_version: accountVersion,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error } = await query;

    if (error) {
      throw new Error('Failed to complete cashu receive quote', {
        cause: error,
      });
    }
  }

  /**
   * Gets the cashu receive quote with the given id.
   * @param id - The id of the cashu receive quote to get.
   * @returns The cashu receive quote or null if it does not exist.
   */
  async get(id: string, options?: Options): Promise<CashuReceiveQuote | null> {
    const query = this.db.from('cashu_receive_quotes').select().eq('id', id);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error('Failed to get cashu receive quote', { cause: error });
    }

    return data ? CashuReceiveQuoteRepository.toQuote(data) : null;
  }

  /**
   * Gets all pending (unpaid or expired) cashu receive quotes for the given user.
   * @param userId - The id of the user to get the cashu receive quotes for.
   * @returns The cashu receive quotes.
   */
  async getPending(
    userId: string,
    options?: Options,
  ): Promise<CashuReceiveQuote[]> {
    const query = this.db
      .from('cashu_receive_quotes')
      .select()
      .eq('user_id', userId)
      .in('state', ['UNPAID', 'EXPIRED']);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to get cashu receive quotes', { cause: error });
    }

    return data.map((data) => CashuReceiveQuoteRepository.toQuote(data));
  }

  static toQuote(data: BoardwalkDbCashuReceiveQuote): CashuReceiveQuote {
    const commonData = {
      id: data.id,
      userId: data.user_id,
      accountId: data.account_id,
      quoteId: data.quote_id,
      amount: new Money({
        amount: data.amount,
        currency: data.currency,
        unit: data.unit,
      }),
      description: data.description ?? undefined,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      paymentRequest: data.payment_request,
      version: data.version,
      lockingDerivationPath: data.locking_derivation_path,
    };

    if (data.state === 'PAID' || data.state === 'COMPLETED') {
      return {
        ...commonData,
        state: data.state,
        keysetId: data.keyset_id ?? '',
        keysetCounter: data.keyset_counter ?? 0,
        outputAmounts: data.output_amounts ?? [],
      };
    }

    if (data.state === 'UNPAID' || data.state === 'EXPIRED') {
      return {
        ...commonData,
        state: data.state,
      };
    }

    throw new Error(`Unexpected quote state ${data.state}`);
  }
}

export function useCashuReceiveQuoteRepository() {
  const encryption = useEncryption();
  return new CashuReceiveQuoteRepository(boardwalkDb, encryption);
}

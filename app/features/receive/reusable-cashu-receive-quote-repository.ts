import { type Currency, Money } from '~/lib/money';
import {
  type AgicashDb,
  type AgicashDbReusableCashuReceiveQuote,
  agicashDb,
} from '../agicash-db/database';
import { getDefaultUnit } from '../shared/currencies';
import { useEncryption } from '../shared/encryption';
import type { ReusableCashuReceiveQuote } from './reusable-cashu-receive-quote';

type Options = {
  abortSignal?: AbortSignal;
};

type Encryption = {
  encrypt: <T = unknown>(data: T) => Promise<string>;
  decrypt: <T = unknown>(data: string) => Promise<T>;
};

type CreateReusableQuote = {
  /**
   * ID of the receiving user.
   */
  userId: string;
  /**
   * ID of the receiving account.
   */
  accountId: string;
  /**
   * Currency of the quote.
   */
  currency: Currency;
  /**
   * Amount of the quote (optional for reusable quotes).
   */
  amount: Money | null;
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
  expiresAt: string | null;
  /**
   * The full BIP32 derivation path used to derive the public key for locking the cashu mint quote.
   */
  lockingDerivationPath: string;
};

export class ReusableCashuReceiveQuoteRepository {
  constructor(
    private readonly db: AgicashDb,
    private readonly encryption: Encryption,
  ) {}

  /**
   * Creates a reusable cashu receive quote.
   * @returns Created reusable cashu receive quote.
   */
  async create(
    params: CreateReusableQuote,
    options?: Options,
  ): Promise<ReusableCashuReceiveQuote> {
    const {
      userId,
      accountId,
      amount,
      quoteId,
      paymentRequest,
      expiresAt,
      lockingDerivationPath,
      currency,
    } = params;

    const unit = getDefaultUnit(currency);

    const query = this.db.rpc('create_reusable_cashu_receive_quote', {
      p_user_id: userId,
      p_account_id: accountId,
      p_currency: currency,
      p_quote_id: quoteId,
      p_payment_request: paymentRequest,
      p_locking_derivation_path: lockingDerivationPath,
      p_expires_at: expiresAt || undefined,
      p_amount: amount?.toNumber(unit) || undefined,
    });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to create reusable cashu receive quote', {
        cause: error,
      });
    }

    return ReusableCashuReceiveQuoteRepository.toQuote(data);
  }

  /**
   * Gets the reusable cashu receive quote with the given id.
   * @param id - The id of the reusable cashu receive quote to get.
   * @returns The reusable cashu receive quote or null if it does not exist.
   */
  async get(
    id: string,
    options?: Options,
  ): Promise<ReusableCashuReceiveQuote | null> {
    const query = this.db
      .from('reusable_cashu_receive_quotes')
      .select()
      .eq('id', Number(id));

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error('Failed to get reusable cashu receive quote', {
        cause: error,
      });
    }

    return data ? ReusableCashuReceiveQuoteRepository.toQuote(data) : null;
  }

  /**
   * get all reusable cashu receive quotes for the given user.
   * @param userId - The id of the user to get the reusable cashu receive quotes for.
   * @returns The reusable cashu receive quotes.
   */
  async getAll(
    userId: string,
    options?: Options,
  ): Promise<ReusableCashuReceiveQuote[]> {
    const query = this.db
      .from('reusable_cashu_receive_quotes')
      .select()
      .eq('user_id', userId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to get reusable cashu receive quotes', {
        cause: error,
      });
    }

    return data.map((data) =>
      ReusableCashuReceiveQuoteRepository.toQuote(data),
    );
  }

  static toQuote(
    data: AgicashDbReusableCashuReceiveQuote,
  ): ReusableCashuReceiveQuote {
    return {
      id: String(data.id),
      userId: data.user_id,
      accountId: data.account_id,
      quoteId: data.quote_id,
      request: data.payment_request,
      currency: data.currency,
      expiresAt: data.expires_at,
      amount: data.amount
        ? new Money({
            amount: Number(data.amount),
            currency: data.currency,
            unit: getDefaultUnit(data.currency),
          })
        : null,
      amountPaid: Number(data.amount_paid || 0),
      amountIssued: Number(data.amount_issued || 0),
      lockingDerivationPath: data.locking_derivation_path as string,
      receiveQuotes: [], // Will be populated when needed
    };
  }
}

export function useReusableCashuReceiveQuoteRepository() {
  const encryption = useEncryption();
  return new ReusableCashuReceiveQuoteRepository(agicashDb, encryption);
}

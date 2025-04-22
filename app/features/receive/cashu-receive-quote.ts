import type { Money } from '~/lib/money';

export type CashuReceiveQuote = {
  id: string;
  /**
   * ID of the user that the quote belongs to.
   */
  userId: string;
  /**
   * ID of the Boardwalk account that the quote belongs to.
   */
  accountId: string;
  /**
   * ID of the mint quote.
   * Once the quote is paid, the mint quote id is used to mint the tokens.
   */
  quoteId: string;
  /**
   * Amount of the quote.
   */
  amount: Money;
  /**
   * Description of the receivequote.
   */
  description?: string;
  /**
   * Date and time the receive quote was created in ISO 8601 format.
   */
  createdAt: string;
  /**
   * Date and time the receive quote expires in ISO 8601 format.
   */
  expiresAt: string;
  state: 'UNPAID' | 'EXPIRED' | 'PAID' | 'COMPLETED';
  /**
   * Payment request for the quote.
   */
  paymentRequest: string;
  /**
   * Row version.
   * Used for optimistic locking.
   */
  version: number;
} & (
  | {
      state: 'UNPAID' | 'EXPIRED';
    }
  | {
      state: 'PAID' | 'COMPLETED';
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
    }
);

import type { Money } from '~/lib/money';

/**
 * Transacion details for sending cashu proofs from an account.
 */
export type CashuSendSwapTransactionDetails = {
  /**
   * The net balance change for the account after this transaction completes.
   * This is the amount that will be deducted from the account.
   */
  totalAmount: Money;
  /**
   * The amount requested by the user.
   */
  amountRequested: Money;
  /**
   * The fee incurred when creating sendable proofs.
   */
  cashuSendSwapFee: Money;
  /**
   * The fee that we include in the token for the receiver.
   */
  cashuReceiveSwapFee: Money;
  /**
   * The total fees for the transaction. Sum of cashuSendSwapFee and cashuReceiveSwapFee.
   */
  totalFees: Money;
};

/**
 * Transacion details for receiving cashu proofs to an account.
 */
export type CashuReceiveSwapTransactionDetails = {
  /**
   * The net balance change for the account after this transaction completes.
   * This is the amount that will be added to the account.
   */
  totalAmount: Money;
  /**
   * The amount of the token being claimed.
   */
  tokenAmount: Money;
  /**
   * The fee that will be incurred when swapping proofs to the account.
   */
  cashuReceiveSwapFee: Money;
  /**
   * The total fees for the transaction. Sum of cashuReceiveSwapFee and cashuSendSwapFee.
   */
  totalFees: Money;
};

type BaseCashuSendQuoteTransactionDetails = {
  /**
   * The net balance change for the account after this transaction completes.
   * This is the amount that will be deducted from the account.
   */
  totalAmount: Money;
  /**
   * The amount of the bolt11 payment request.
   *
   * TODO: Right now cashu only supports invoices with an amount.
   * This will be the amount requested by the user when we have amountless invoices.
   */
  amountRequested: Money;
  /**
   * The amount reserved upfront to cover the maximum potential Lightning Network fees.
   *
   * If the actual Lightning fee ends up being lower than this reserve,
   * the difference is returned as change to the user.
   */
  lightningFeeReserve: Money;
  /**
   * The fee incurred to spend the proofs in the cashu melt operation
   */
  cashuSendSwapFee: Money;
  /**
   * The total fees for the transaction. Sum of lightningFeeReserve and cashuSendSwapFee.
   */
  totalFees: Money;
  /**
   * The bolt11 payment request.
   */
  paymentRequest: string;
};

/**
 * Transacion details for a cashu lightning send transaction that is not yet completed.
 */
export type IncompleteCashuSendQuoteTransactionDetails =
  BaseCashuSendQuoteTransactionDetails;

/**
 * Transacion details for a cashu lightning send transaction that is completed.
 */
export type CompletedCashuSendQuoteTransactionDetails =
  BaseCashuSendQuoteTransactionDetails & {
    /**
     * The preimage of the lightning payment.
     * If the lightning payment is settled internally in the mint, this will be an empty string or 0
     */
    preimage: string;
    /**
     * The actual Lightning Network fee that was charged after the transaction completed.
     * This may be less than the `lightningFeeReserve` if the payment was cheaper than expected.
     *
     * The difference between the `lightningFeeReserve` and the `actualLightningFee` is returned as change to the user.
     */
    actualLightningFee: Money;
  };

/**
 * Transacion details for receiving cashu lightning payments to an account.
 */
export type CashuReceiveQuoteTransactionDetails = {
  /**
   * The net balance change for the account after this transaction completes.
   * This is the amount that will be added to the account.
   */
  totalAmount: Money;
  /**
   * The amount requested by the user for the bolt11 payment request.
   */
  amountRequested: Money;
  /**
   * The bolt11 payment request.
   */
  paymentRequest: string;
  /**
   * The description of the transaction.
   */
  description?: string;
};

export type Transaction = {
  /**
   * ID of the transaction.
   */
  id: string;
  /**
   * ID of the user that the transaction belongs to.
   */
  userId: string;
  /**
   * Direction of the transaction.
   */
  direction: 'SEND' | 'RECEIVE';
  /**
   * Type of the transaction.
   */
  type: 'CASHU_LIGHTNING' | 'CASHU_TOKEN';
  /**
   * State of the transaction.
   * Transaction states are:
   * - DRAFT: The transaction is drafted but might never be initiated and thus completed.
   * - PENDING: The transaction was initiated and is being processed.
   * - COMPLETED: The transaction has been completed. At this point the sender cannot reverse the transaction.
   * - FAILED: The transaction has failed.
   * - REVERSED: The transaction was reversed and money was returned to the account.
   */
  state: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  /**
   * ID of the account that the transaction was sent from or received to.
   * For SEND transactions, it is the account that the transaction was sent from.
   * For RECEIVE transactions, it is the account that the transaction was received to.
   */
  accountId: string;
  /**
   * Amount of the transaction.
   */
  amount: Money;
  /**
   * Transaction details.
   */
  details: object;
  /**
   * ID of the transaction that is reversed by this transaction.
   */
  reversedTransactionId?: string | null;
  /**
   * Date and time the transaction was created in ISO 8601 format.
   */
  createdAt: string;
  /**
   * Date and time the transaction was set to pending in ISO 8601 format.
   */
  pendingAt?: string | null;
  /**
   * Date and time the transaction was completed in ISO 8601 format.
   */
  completedAt?: string | null;
  /**
   * Date and time the transaction failed in ISO 8601 format.
   */
  failedAt?: string | null;
  /**
   * Date and time the transaction was reversed in ISO 8601 format.
   */
  reversedAt?: string | null;
} & (
  | {
      type: 'CASHU_TOKEN';
      direction: 'SEND';
      details: CashuSendSwapTransactionDetails;
    }
  | {
      type: 'CASHU_TOKEN';
      direction: 'RECEIVE';
      details: CashuReceiveSwapTransactionDetails;
    }
  | {
      type: 'CASHU_LIGHTNING';
      direction: 'SEND';
      state: 'DRAFT' | 'PENDING' | 'FAILED';
      details: IncompleteCashuSendQuoteTransactionDetails;
    }
  | {
      type: 'CASHU_LIGHTNING';
      direction: 'SEND';
      state: 'COMPLETED';
      details: CompletedCashuSendQuoteTransactionDetails;
    }
  | {
      type: 'CASHU_LIGHTNING';
      direction: 'RECEIVE';
      details: CashuReceiveQuoteTransactionDetails;
    }
);

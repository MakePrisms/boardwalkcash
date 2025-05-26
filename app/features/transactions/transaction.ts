import type { Money } from '~/lib/money';

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
  type: 'CASHU_LIGHTNING' | 'CASHU_TOKEN' | 'CASHU_PAYMENT_REQUEST';
  /**
   * State of the transaction.
   * Transaction states are:
   * - DRAFT: The transaction is drafted but might never be initiated and thus completed.
   * - PENDING: The transaction was initiated and is being processed. At this point the sender cannot reverse the transaction.
   * - COMPLETED: The transaction has been completed.
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
   * If this transaction reverses another transaction, this is the id of the
   * reversed transaction.
   */
  reversedTxid?: string | null;
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
};

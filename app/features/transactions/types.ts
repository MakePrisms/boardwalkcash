export type Transaction = {
  /** The transaction id */
  id: string;
  /** The ID of the account that the transaction belongs to */
  accountId: string;
  /** The absolute amount of the transaction */
  amount: string;
  /** The timestamp of the transaction in unix milliseconds */
  timestamp: number;
  /** The direction of the transaction. 'in' for incoming, 'out' for outgoing */
  direction: 'in' | 'out';
  /** The status of the transaction */
  status: 'pending' | 'confirmed';
  /** The token that the transaction is for. Should only be present for cashu accounts */
  token?: string;
};

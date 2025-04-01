import type { Proof } from '@cashu/cashu-ts';
import type { Money } from '~/lib/money';

export type CashuTokenSwap = {
  /**
   * A hash of the token being received
   */
  tokenHash: string;
  /**
   * The proofs from the token being received
   */
  tokenProofs: Proof[];
  /**
   * The user ID of the user receiving the token
   */
  userId: string;
  /**
   * The account ID of the account receiving the token
   */
  accountId: string;
  /**
   * The amount of the token being received
   */
  amount: Money;
  /**
   * ID of the keyset used to create the blinded messages
   */
  keysetId: string;
  /**
   * Counter value for the keyset at the time the time of quote payment
   */
  keysetCounter: number;
  /**
   * The output amount for each blinded message
   */
  outputAmounts: number[];
  /**
   * The state of the token swap
   */
  state: 'PENDING' | 'COMPLETED';
  /**
   * Timestamp when the token swap was created
   */
  createdAt: string;
};

export class FailedToCompleteTokenSwapError extends Error {
  /**
   * The token swap that failed to complete
   */
  tokenSwap: CashuTokenSwap;
  constructor(message: string, tokenSwap: CashuTokenSwap) {
    super(message);
    this.tokenSwap = tokenSwap;
  }
}

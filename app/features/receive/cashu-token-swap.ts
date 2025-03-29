import type { Proof } from '@cashu/cashu-ts';
import type { Money } from '~/lib/money';

export type CashuTokenSwap = {
  id: string;
  /** A hash of the token being received */
  tokenHash: string; // QUESTION: should we have this and the ID if we will use the hash to query? The id could be set as the hash.
  tokenProofs: Proof[];
  userId: string;
  accountId: string;
  amount: Money;
  keysetId: string;
  keysetCounter: number;
  outputAmounts: number[];
  createdAt: string;
  state: 'PENDING' | 'COMPLETED' | 'FAILED';
};

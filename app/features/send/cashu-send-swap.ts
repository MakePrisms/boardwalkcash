import type { OutputData, Proof } from '@cashu/cashu-ts';
import type { Currency, Money } from '~/lib/money';

export type CashuSendSwap = {
  /**
   * The id of the swap
   */
  id: string;
  /**
   * The id of the account that the swap belongs to
   */
  accountId: string;
  /**
   * The id of the user that the swap belongs to
   */
  userId: string;
  /**
   * The proofs from the account that will be spent.
   * These are removed from the account's balance for the duration of the swap, then either returned or spent.
   */
  inputProofs: Proof[];
  /**
   * The proofs that will be sent. If we have the exact proofs to send,
   * then this will be the same as inputProofs and no cashu swap will occur.
   * If the inputProofs sum to more than the amount to send, then this
   * will be the result of swapping the inputProofs for the amount to send.
   */
  proofsToSend?: Proof[];
  /**
   * The amount requested to send
   */
  amountRequested: Money;
  /**
   * The total amount to send. This is the sum of proofsToSend.
   */
  amountToSend: Money;
  /**
   * The swap fee calculated from the keyset's fee rate
   */
  fee: Money;
  /**
   * The keyset id that output data is generated from.
   */
  keysetId: string;
  /**
   * The currency of the account and amount to send.
   */
  currency: Currency;
  /**
   * The mint url of the account.
   */
  mintUrl: string;
  /**
   * - SWAPPING: The swap entity has been created, but there are no proofs to send yet.
   * - READY: There are proofs to send
   * - COMPLETED: The swap is completed and the proofs have been sent.
   * - RECLAIMED: The user has reclaimed the proofs to send.
   */
  state: 'SWAPPING' | 'READY' | 'COMPLETED' | 'RECLAIMED';
  /**
   * The version of the swap used for optimistic locking.
   */
  version: number;
  /**
   * The id of the transaction that the swap belongs to.
   */
  transactionId: string;
  /**
   * The output data used for deterministic outputs when we swap the inputProofs
   * for proofsToSend.
   */
  outputData: {
    /** Output data for the change from the swap. */
    keep: OutputData[];
    /** Output data for the amount to send. */
    send: OutputData[];
  };
  /**
   * The keyset counter used to generate the output data at the time the swap was created.
   */
  keysetCounter: number;
};

import type { Money } from '~/lib/money';
import type { AccountType } from '../accounts/account';

// Genaral rule: if money moves then it should be included in the transaction history

// - include failed transactions? - Take it case by case based on transaction type

// - include all pending transactions? - If its valuable to the user, yes otherwise keep it simple
//    - maybe show somewhere requests that have been created, but not to start

// - should the transaction types be connected to the account types?
//    - ie. type TransactionType = AccountType;

// - should we include the method used? Or is tx type along with data enough?

// - Everything except the id and accountId should be encrypted

// NOTES:
// - we can't always verify payments to lightning address have completed (requires lnurl server to implemnt lnurl verify ?lud21?)

type TransactionDirection = 'in' | 'out';
// QUESTION: should this be the same as the account type?
type TransactionType = AccountType;
type TransactionStatus = 'pending' | 'confirmed';

export type Transaction = {
  /** The transaction id */
  id: string;
  /** The ID of the account that the transaction belongs to */
  accountId: string;
  /** The type of the transaction */
  type: TransactionType;
  /**
   * The absolute amount of the transaction
   * The currency is the same as the account currency
   */
  amount: Money;
  /** The timestamp of the transaction in unix milliseconds */
  timestampMs: number;
  /** The direction of the transaction. 'in' for incoming, 'out' for outgoing */
  direction: TransactionDirection;
  /**
   * The status of the transaction
   *
   * - 'pending' a payment was requested but not yet confirmed
   * - 'confirmed' the payment was successfully sent or received
   */
  status: TransactionStatus;
  /**
   * Whether its a payment request, an invoice, a token, etc.
   * This it the the thing that got paid
   */
  data: string; // TODO: better name?
};

// export type IncomingTransaction = BaseTransaction & {
//   direction: 'in';
//   source: string;
// }

// export type OutgoingTransaction = BaseTransaction & {
//   direction: 'out';
//   destination: string;
// }

// export type Transaction = {

// } & (
//   | {
//       type: 'cashu';
//       /**
//        * The method the transaction was sent with or requested with
//        *
//        * - 'bolt11' when paying a bolt11 invoice or when receiving via a bolt11 generated by the mint
//        * - 'cashu-request' send or recieve via NUT-18 cashu requests
//        * - 'token' when sending
//        */
//       method: 'bolt11' | 'cashu-request' | 'token'
//       // QUESTION: not sure how to handle this. I guess type is always going to be the type of the account
//       // sent/received from? This would be the mint url for if a token was sent
//       mintUrl: string;
//       /**
//        * Only set when direction is 'out'
//        * - `ln${string}` for paying to a bolt11 invoice
//        * - `${string}@${string}` for sending to a lightning address
//        * - `creq${string}` for sending via a cashu request
//        * - `cashu${string}` the token that was sent
//        * - `undefined` when direction is 'in'
//        */
//       destination?: `ln${string}` | `${string}@${string}` | `creq${string}` | `cashu${string}` | undefined;
//       /**
//        * Only set when direction is 'in'
//        * - `ln${string}` bolt11 invoice when method is `bolt11`
//        * - `creq${string}` cashu request when method is `cashu-request`
//        * - `undefined` when direction is 'out'
//        */
//       source?: `ln${string}` | `creq${string}` | null | undefined;
//     }
//   | {
//       type: 'nwc';
//       /**
//        * The invoice that was paid or requested to be paid
//        */
//       bolt11: string;
//       /**
//        * The destination of the transaction
//        *
//        * - `ln${string}` for paying to a bolt11 invoice
//        * - `${string}@${string}` for sending to a lightning address
//        * - `creq${string}` for sending via a cashu request
//        * - `null` when method is `token`
//        */
//       destination: `ln${string}` | `${string}@${string}` | `creq${string}` | null
//     }
//     | {
//       type: 'spark'
//       /**
//        * Spark supports multiple methods of payment.
//        *
//        * - 'bolt11' for lightning network payments using bolt11 invoices
//        * - 'onchain' for onchain bitcoin payments
//        * - 'spark' for transactions to/from spark addresses
//        */
//       method: 'bolt11' | 'onchain' | 'spark'
//       /**
//        * Only set when direction is 'out'
//        *
//        * - `ln${string}` for paying to a bolt11 invoice
//        * - `${string}@${string}` for sending to a lightning address
//        * - `bc1${string}` for sending to a bitcoin address
//        * - `03${string}` | `02${string}` for sending to a spark address
//        * - `undefined` when direction is 'in'
//        */
//       destination?: `ln${string}` | `${string}@${string}` | `bc1${string}` | `03${string}` | `02${string}` | undefined
//       /**
//        * Only set when direction is 'in'
//        *
//        * - `ln${string}` bolt11 invoice when method is `bolt11`
//        * - `${string}@${string}` lightning address when method is `bolt11`
//        * - `bc1${string}` bitcoin address when method is `onchain`
//        * - `03${string}` | `02${string}` spark address when method is `spark`
//        * - `null` when method is `onchain`
//        * - `undefined` when direction is 'out'
//        */
//       source?: `ln${string}` | `${string}@${string}` | `bc1${string}` | `03${string}` | `02${string}` | undefined;
//     }
// );

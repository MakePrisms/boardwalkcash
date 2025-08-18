import type { Currency, Money } from '~/lib/money';
import type { CashuReceiveQuote } from './cashu-receive-quote';

export type ReusableCashuReceiveQuote = {
  id: string;
  userId: string;
  accountId: string;
  quoteId: string;
  request: string;
  currency: Currency;
  expiresAt: string | null;
  amount: Money | null;
  amountPaid: number;
  amountIssued: number;
  lockingDerivationPath: string;
  receiveQuotes: CashuReceiveQuote[];
};

import type { Currency } from '~/lib/money';

export type AccountType = 'cashu' | 'nwc' | 'spark';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  createdAt: string;
} & (
  | {
      type: 'cashu';
      mintUrl: string;
      isTestMint: boolean;
    }
  | {
      type: 'nwc';
      nwcUrl: string;
    }
  | {
      type: 'spark';
    }
);

export type CashuAccount = Extract<Account, { type: 'cashu' }>;
export type SparkAccount = Extract<Account, { type: 'spark' }>;

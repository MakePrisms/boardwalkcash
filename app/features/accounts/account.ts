import type { Currency } from '~/lib/money';

export type AccountType = 'cashu' | 'nwc';

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
);

export type CashuAccount = Extract<Account, { type: 'cashu' }>;

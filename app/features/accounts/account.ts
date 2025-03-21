import type { Proof } from '@cashu/cashu-ts';
import { sumProofs } from '~/lib/cashu';
import { type Currency, Money } from '~/lib/money';
import { getDefaultUnit } from '../shared/currencies';

export type AccountType = 'cashu' | 'nwc';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  createdAt: string;
  /**
   * Row version.
   * Used for optimistic locking.
   */
  version: number;
} & (
  | {
      type: 'cashu';
      mintUrl: string;
      isTestMint: boolean;
      /**
       * Holds counter value for each mint keyset. Key is the keyset id, value is counter value.
       */
      keysetCounters: Record<string, number>;
      // TODO: See if this is the type we want here
      proofs: Proof[];
    }
  | {
      type: 'nwc';
      nwcUrl: string;
    }
);

export type CashuAccount = Extract<Account, { type: 'cashu' }>;

export const getAccountBalance = (account: Account) => {
  if (account.type === 'cashu') {
    const value = sumProofs(account.proofs);
    return new Money({
      amount: value,
      currency: account.currency,
      unit: getDefaultUnit(account.currency),
    });
  }
  // TODO: implement balance logic for other account types
  return new Money({ amount: 0, currency: account.currency });
};

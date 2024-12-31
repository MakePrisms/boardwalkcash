import { create } from 'zustand';
import type { Currency } from '~/lib/money';
import { accounts } from '~/routes/_protected._index';
import type { Account } from '../accounts/account-selector';

type FiatCurrency = Exclude<Currency, 'BTC'>;

type SettingsState = {
  defaultAccount: Account;
  defaultFiatCurrency: FiatCurrency;
};

type SettingsActions = {
  setDefaultAccount: (accountId: Account['id']) => void;
  setDefaultFiatCurrency: (currency: FiatCurrency) => void;
};

export const settingsStore = create<SettingsState & SettingsActions>()(
  (set) => ({
    defaultAccount: accounts[0] as Account,
    defaultFiatCurrency: 'USD',
    setDefaultAccount: (accountId) =>
      set({
        defaultAccount: accounts.find((account) => account.id === accountId),
      }),
    setDefaultFiatCurrency: (currency) =>
      set({ defaultFiatCurrency: currency }),
  }),
);

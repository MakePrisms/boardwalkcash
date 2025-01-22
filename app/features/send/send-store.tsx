import { create } from 'zustand';
import { type Currency, Money } from '~/lib/money';
import type { Account } from '../accounts/account-selector';

export type SendState<T extends Currency = Currency> = {
  /** The account to send funds from */
  account: Account;
  /** The amount to send in the account's currency */
  amount: Money<T> | null;
  /** Set the account to send funds from */
  setAccount: (account: Account) => void;
  /** Set the amount to send in the account's currency */
  setAmount: (amount: Money<T>) => void;
};

export const createSendStore = ({
  initialAccount,
  initialAmount,
}: {
  initialAccount: Account;
  initialAmount: Money | null;
}) => {
  return create<SendState>((set) => ({
    account: initialAccount,
    amount: initialAmount,
    setAccount: (account) =>
      set({ account, amount: Money.zero(account.currency) }),
    setAmount: (amount) => set({ amount }),
  }));
};

export type SendStore = ReturnType<typeof createSendStore>;

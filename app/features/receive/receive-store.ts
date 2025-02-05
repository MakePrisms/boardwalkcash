import { create } from 'zustand';
import { type Currency, Money } from '~/lib/money';
import type { Account } from '../accounts/account-selector';

export type ReceiveState<T extends Currency = Currency> = {
  /** The account to receive funds in */
  account: Account;
  /** The amount to receive in the account's currency */
  amount: Money<T> | null;
  /** Set the account to receive funds in */
  setAccount: (account: Account) => void;
  /** Set the amount to receive in the account's currency */
  setAmount: (amount: Money<T>) => void;
};

export const createReceiveStore = ({
  initialAccount,
  initialAmount,
}: {
  initialAccount: Account;
  initialAmount: Money | null;
}) => {
  return create<ReceiveState>((set) => ({
    account: initialAccount,
    amount: initialAmount,
    setAccount: (account) =>
      set({ account, amount: Money.zero(account.currency) }),
    setAmount: (amount) => set({ amount }),
  }));
};

export type ReceiveStore = ReturnType<typeof createReceiveStore>;

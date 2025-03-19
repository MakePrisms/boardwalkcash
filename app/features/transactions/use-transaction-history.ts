import { getEncodedToken } from '@cashu/cashu-ts';
import { useAccounts } from '~/features/accounts/account-hooks';
import { createMockToken } from '~/lib/cashu/testing';
import { type Currency, Money } from '~/lib/money';
import type { Account } from '../accounts/account';
import { getDefaultUnit } from '../shared/currencies';
import type { Transaction } from './types';

// NOTE: this whole file is a mock implementation. It just creates
// some transactions for each account.

export function useTransactionHistory() {
  return useMockTransactions();
}

const amountToMoney = (amount: string, currency: Currency) => {
  return new Money({ amount, currency, unit: getDefaultUnit(currency) });
};

const fakeInvoice =
  'lnbc2500u1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpuaztrnwngzn3kdzw5hydlzf03qdgm2hdq27cqv3agm2awhz5se903vruatfhq77w3ls4evs3ch9zw97j25emudupq63nyw24cg27h2rspfj9srp';

const toTxData = (
  account: Account,
  amount: number,
): {
  type: Transaction['type'];
  data: Transaction['data'];
  amount: Money<Currency>;
} => {
  const moneyAmount = amountToMoney(amount.toString(), account.currency);
  if (account.type === 'cashu') {
    const isToken = Math.random() < 0.5; // Randomly decide between token or invoice
    return {
      type: 'cashu',
      data: isToken ? getEncodedToken(createMockToken(amount)) : fakeInvoice, // Example invoice data
      amount: moneyAmount,
    };
  }
  if (account.type === 'nwc') {
    return {
      type: 'nwc',
      data: fakeInvoice,
      amount: moneyAmount,
    };
  }
  throw new Error('Invalid account type');
};

function useMockTransactions(): Transaction[] {
  const { data: accounts } = useAccounts();
  const transactions: Transaction[] = [];

  accounts.forEach((account) => {
    transactions.push(
      // Pending transactions
      {
        id: `${account.id}-pending-in`,
        accountId: account.id,
        timestampMs: Date.now() - 1000,
        direction: 'in',
        status: 'pending',
        ...toTxData(account, 50),
      },
      {
        id: `${account.id}-pending-out`,
        accountId: account.id,
        timestampMs: Date.now() - 5000,
        direction: 'out',
        status: 'pending',
        ...toTxData(account, 75),
      },
      // Today's transactions
      {
        id: `${account.id}-today-1`,
        accountId: account.id,
        timestampMs: Date.now() - 2 * 60 * 60 * 1000,
        direction: 'in',
        status: 'confirmed',
        ...toTxData(account, 100),
      },
      {
        id: `${account.id}-today-2`,
        accountId: account.id,
        timestampMs: Date.now() - 5 * 60 * 60 * 1000,
        direction: 'out',
        status: 'confirmed',
        ...toTxData(account, 200),
      },
      // This week's transactions
      {
        id: `${account.id}-week-1`,
        accountId: account.id,
        timestampMs: Date.now() - 2 * 24 * 60 * 60 * 1000,
        direction: 'in',
        status: 'confirmed',
        ...toTxData(account, 150),
      },
      {
        id: `${account.id}-week-2`,
        accountId: account.id,
        timestampMs: Date.now() - 4 * 24 * 60 * 60 * 1000,
        direction: 'out',
        status: 'confirmed',
        ...toTxData(account, 300),
      },
      // Older transactions
      {
        id: `${account.id}-old-1`,
        accountId: account.id,
        timestampMs: Date.now() - 14 * 24 * 60 * 60 * 1000,
        direction: 'in',
        status: 'confirmed',
        ...toTxData(account, 1000),
      },
      {
        id: `${account.id}-old-2`,
        accountId: account.id,
        timestampMs: Date.now() - 30 * 24 * 60 * 60 * 1000,
        direction: 'out',
        status: 'confirmed',
        ...toTxData(account, 500),
      },
    );
  });

  return transactions;
}

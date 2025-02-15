import { useState } from 'react';
import { useAccounts } from '../accounts/use-accounts';
import type { Transaction } from './types';

function generateMockTransactions(accountIds: string[]): Transaction[] {
  const transactions: Transaction[] = [];

  accountIds.forEach((accountId) => {
    // Pending transaction
    transactions.push({
      id: `${accountId}-pending-in`,
      accountId,
      amount: '50',
      timestamp: Date.now() - 1000,
      direction: 'in',
      status: 'pending',
    });

    transactions.push({
      id: `${accountId}-pending-out`,
      accountId,
      amount: '75',
      timestamp: Date.now() - 5000,
      direction: 'out',
      status: 'pending',
    });

    // Today's transactions
    transactions.push({
      id: `${accountId}-today-1`,
      accountId,
      amount: '100',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      direction: 'in',
      status: 'confirmed',
    });

    transactions.push({
      id: `${accountId}-today-2`,
      accountId,
      amount: '200',
      timestamp: Date.now() - 5 * 60 * 60 * 1000,
      direction: 'out',
      status: 'confirmed',
    });

    // This week's transactions
    transactions.push({
      id: `${accountId}-week-1`,
      accountId,
      amount: '150',
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
      direction: 'in',
      status: 'confirmed',
    });

    transactions.push({
      id: `${accountId}-week-2`,
      accountId,
      amount: '300',
      timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
      direction: 'out',
      status: 'confirmed',
    });

    // Older transactions
    transactions.push({
      id: `${accountId}-old-1`,
      accountId,
      amount: '1000',
      timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000,
      direction: 'in',
      status: 'confirmed',
    });

    transactions.push({
      id: `${accountId}-old-2`,
      accountId,
      amount: '500',
      timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
      direction: 'out',
      status: 'confirmed',
    });
  });

  return transactions;
}

export function useTransactionHistory() {
  const { data: accounts } = useAccounts();
  const accountIds = accounts?.map((account) => account.id) || [];
  const [transactions] = useState(() => generateMockTransactions(accountIds));
  return transactions;
}

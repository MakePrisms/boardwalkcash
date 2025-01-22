import { useState } from 'react';
import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Page } from '~/components/page';
import { HistoryTable, type Transaction } from '~/features/transactions';

export const mockTransactions: Transaction[] = [
  // Pending
  {
    id: '1',
    accountId: '1',
    amount: '50',
    timestamp: Date.now() - 1000,
    direction: 'in',
    status: 'pending',
  },
  {
    id: '2',
    accountId: '2',
    amount: '75',
    timestamp: Date.now() - 5000,
    direction: 'out',
    status: 'pending',
    token:
      'cashuBo2FteCJodHRwczovL25vZmVlcy50ZXN0bnV0LmNhc2h1LnNwYWNlYXVjc2F0YXSBomFpSAC0zSfYhhpEYXCDo2FhAWFzeEBlYzEzZjMzNzkwNDBmNjY4YTdiZTUzMDU0MmUyNjJiNTQzNmFkODk1MDJmMzA2ZDY3OTJiMGRmMjQ4OWMwZDVmYWNYIQMK0GZsOhoDfEYPR1BKyDYafJS0MUkfM7LjoQRWLz3X06NhYQRhc3hAYWI5YmJmZDgyMzNkZmNmNmIwMmY2MTQ2OWE4ZDU1NDE0NTYxMGNkZDI0ZDY3YTI0OWM0MDFkMjI0YjdmYjVmZWFjWCECcBbIqunJk-K28WCY_TxZwG99QRhrI8TD9ITYuBMYZ3ujYWEQYXN4QGZiYzllZmE4ZDNiNDQ3OWZjMzA4ZGQxM2QyODc1ZjA4OTRkMzI4MTdkNDRmY2RiMDNmNmIwZmEyZDM0M2NjNWNhY1ghA_AMaHaJnf5QKN9oRkjU6XZsCd-GHFes3ZMXJYtwjyIC',
  },
  // Today
  {
    id: '3',
    accountId: '2',
    amount: '100',
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    direction: 'in',
    status: 'confirmed',
  },
  {
    id: '4',
    accountId: '1',
    amount: '200',
    timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
    direction: 'out',
    status: 'confirmed',
  },
  // This week
  {
    id: '5',
    accountId: '1',
    amount: '150',
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    direction: 'in',
    status: 'confirmed',
  },
  {
    id: '6',
    accountId: '1',
    amount: '300',
    timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000, // 4 days ago
    direction: 'out',
    status: 'confirmed',
  },
  // Older
  {
    id: '7',
    accountId: '2',
    amount: '1000',
    timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days ago
    direction: 'in',
    status: 'confirmed',
  },
  {
    id: '8',
    accountId: '1',
    amount: '500',
    timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    direction: 'out',
    status: 'confirmed',
  },
];

export default function TransactionHistoryIndex() {
  const [transactions] = useState(mockTransactions);

  return (
    <Page>
      <PageHeader>
        <ClosePageButton to="/" transition="slideRight" applyTo="oldView" />
        <PageHeaderTitle>Transaction History</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        <HistoryTable transactions={transactions} />
      </PageContent>
    </Page>
  );
}

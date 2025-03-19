import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table';
import { useAccounts } from '~/features/accounts/account-hooks';
import { AccountTypeIcon } from '~/features/accounts/account-icons';
import { LinkWithViewTransition } from '~/lib/transitions';
import { getDefaultUnit } from '../shared/currencies';
import type { Transaction } from './types';

/** Format a timestamp to a short relative time string */
function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diffInSeconds = (now - timestamp) / 1000;

  if (diffInSeconds < 20) {
    return 'now';
  }
  if (diffInSeconds < 60) {
    return `${Math.floor(diffInSeconds)}s`;
  }
  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m`;
  }
  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h`;
  }
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** A row in the transaction history table */
const TransactionRow = ({ transaction }: { transaction: Transaction }) => {
  const { data: accounts } = useAccounts();
  const account = accounts?.find((a) => a.id === transaction.accountId);
  if (!account) throw new Error('Account not found');
  return (
    <TableRow className="border-none">
      <LinkWithViewTransition
        to={`/transactions/${transaction.id}`}
        transition="slideUp"
        applyTo="newView"
        className="flex w-full items-center justify-start gap-2"
      >
        <TableCell>
          <AccountTypeIcon type={account.type} />
        </TableCell>
        <TableCell className="flex-grow">
          <div className="flex flex-col gap-0">
            <div className="flex items-center justify-between">
              <p>
                {transaction.direction === 'in' && '+'}
                {transaction.amount.toLocaleString({
                  unit: getDefaultUnit(transaction.amount.currency),
                })}
              </p>
              <span className="text-muted-foreground text-xs">
                {formatTimestamp(transaction.timestampMs)}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {transaction.direction === 'in'
                ? 'Payment received'
                : 'Payment sent'}
            </p>
          </div>
        </TableCell>
      </LinkWithViewTransition>
    </TableRow>
  );
};

/** A section of the transaction history table that groups transacations by a label */
const TransactionSection = ({
  title,
  transactions,
}: { title: string; transactions: Transaction[] }) => {
  if (transactions.length === 0) return null;

  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={3} className="py-2">
          <span className="font-medium text-lg">{title}</span>
        </TableCell>
      </TableRow>
      {transactions.map((t) => (
        <TransactionRow key={t.id} transaction={t} />
      ))}
    </>
  );
};

/** Filter transactions by status and time range */
const useFilteredTransactions = (transactions: Transaction[]) => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const pendingTransactions = transactions.filter(
    (t) => t.status === 'pending',
  );
  const todayTransactions = transactions.filter(
    (t) => t.status === 'confirmed' && t.timestampMs > oneDayAgo,
  );
  const thisWeekTransactions = transactions.filter(
    (t) =>
      t.status === 'confirmed' &&
      t.timestampMs <= oneDayAgo &&
      t.timestampMs > oneWeekAgo,
  );
  const olderTransactions = transactions.filter(
    (t) => t.status === 'confirmed' && t.timestampMs <= oneWeekAgo,
  );

  return {
    pendingTransactions,
    todayTransactions,
    thisWeekTransactions,
    olderTransactions,
  };
};

export function HistoryTable({
  transactions,
}: { transactions: Transaction[] }) {
  const {
    pendingTransactions,
    todayTransactions,
    thisWeekTransactions,
    olderTransactions,
  } = useFilteredTransactions(transactions);

  return (
    <Table>
      <TableBody>
        <TransactionSection
          title="Pending"
          transactions={pendingTransactions}
        />
        <TransactionSection title="Today" transactions={todayTransactions} />
        <TransactionSection
          title="This Week"
          transactions={thisWeekTransactions}
        />
        <TransactionSection title="Older" transactions={olderTransactions} />
      </TableBody>
    </Table>
  );
}

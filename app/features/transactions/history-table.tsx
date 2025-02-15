import { Banknote, Zap } from 'lucide-react';
import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table';
import type { Account } from '~/features/accounts/account';
import { useAccounts } from '~/features/accounts/use-accounts';
import { Money } from '~/lib/money';
import { LinkWithViewTransition } from '~/lib/transitions';
import type { Transaction } from './types';

const icons: Record<Account['type'], React.ReactNode> = {
  cashu: <Banknote />,
  nwc: <Zap />,
};

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
        <TableCell>{icons[account.type]}</TableCell>
        <TableCell className="flex-grow">
          <div className="flex flex-col gap-0">
            <div className="flex items-center justify-between">
              {new Money({
                amount: transaction.amount,
                currency: 'USD',
              }).toLocaleString({ unit: 'usd' })}
              <span className="text-muted-foreground text-xs">
                {formatTimestamp(transaction.timestamp)}
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

export function HistoryTable({
  transactions,
}: { transactions: Transaction[] }) {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const pendingTransactions = transactions.filter(
    (t) => t.status === 'pending',
  );
  const todayTransactions = transactions.filter(
    (t) => t.status === 'confirmed' && t.timestamp > oneDayAgo,
  );
  const thisWeekTransactions = transactions.filter(
    (t) =>
      t.status === 'confirmed' &&
      t.timestamp <= oneDayAgo &&
      t.timestamp > oneWeekAgo,
  );
  const olderTransactions = transactions.filter(
    (t) => t.status === 'confirmed' && t.timestamp <= oneWeekAgo,
  );
  return (
    <Table>
      <TableBody>
        {/* <ScrollArea> */}
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
        {/* </ScrollArea> */}
      </TableBody>
    </Table>
  );
}

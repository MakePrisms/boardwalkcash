import { useEffect, useRef } from 'react';
import { LinkWithViewTransition } from '~/lib/transitions';
import { useAccount } from '../accounts/account-hooks';
import { AccountTypeIcon } from '../accounts/account-icons';
import { getDefaultUnit } from '../shared/currencies';
import type { Transaction } from './transaction';
import { useTransactions } from './transaction-hooks';

function LoadMore({
  onEndReached,
  isLoading,
}: {
  onEndReached: () => void;
  isLoading?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onEndReached();
        }
      },
      { threshold: 0 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [onEndReached]);

  return (
    <div ref={ref} className="h-4 w-full">
      {isLoading && (
        <div className="flex justify-center p-4">
          <span className="text-muted-foreground text-sm">Loading more...</span>
        </div>
      )}
    </div>
  );
}

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

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const account = useAccount(transaction.accountId);

  return (
    <tr className="flex w-full items-center justify-start gap-4">
      <td>
        <LinkWithViewTransition
          to={`/transactions/${transaction.id}`}
          transition="slideUp"
          applyTo="newView"
        >
          <AccountTypeIcon type={account.type} />
        </LinkWithViewTransition>
      </td>
      <td className="w-full flex-grow">
        <LinkWithViewTransition
          to={`/transactions/${transaction.id}`}
          transition="slideUp"
          applyTo="newView"
        >
          <div className="flex w-full flex-col gap-0">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                {transaction.direction === 'RECEIVE' && '+'}
                {transaction.amount.toLocaleString({
                  unit: getDefaultUnit(transaction.amount.currency),
                })}
              </p>
              <span className="text-muted-foreground text-xs">
                {formatTimestamp(new Date(transaction.createdAt).getTime())}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {transaction.state === 'CANCELLED'
                ? 'Payment cancelled'
                : transaction.state === 'PENDING'
                  ? 'Payment pending'
                  : transaction.direction === 'RECEIVE'
                    ? 'Payment received'
                    : 'Payment sent'}
            </p>
          </div>
        </LinkWithViewTransition>
      </td>
    </tr>
  );
}

function TransactionSection({
  title,
  transactions,
}: {
  title: string;
  transactions: Transaction[];
}) {
  if (transactions.length === 0) return null;

  return (
    <>
      <tr className="hover:bg-transparent">
        <td colSpan={2} className="py-2">
          <span className="font-medium text-lg">{title}</span>
        </td>
      </tr>
      {transactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
    </>
  );
}

/** Filter transactions by status and time range */
function useFilteredTransactions(transactions: Transaction[]) {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const pendingTransactions = transactions.filter((t) => t.state === 'PENDING');
  const todayTransactions = transactions.filter(
    (t) =>
      ['COMPLETED', 'CANCELLED'].includes(t.state) &&
      new Date(t.createdAt).getTime() > oneDayAgo,
  );
  const thisWeekTransactions = transactions.filter(
    (t) =>
      ['COMPLETED', 'CANCELLED'].includes(t.state) &&
      new Date(t.createdAt).getTime() <= oneDayAgo &&
      new Date(t.createdAt).getTime() > oneWeekAgo,
  );
  const olderTransactions = transactions.filter(
    (t) =>
      ['COMPLETED', 'CANCELLED'].includes(t.state) &&
      new Date(t.createdAt).getTime() <= oneWeekAgo,
  );

  return {
    pendingTransactions,
    todayTransactions,
    thisWeekTransactions,
    olderTransactions,
  };
}

export function TransactionList() {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useTransactions();

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="text-destructive">Error loading transactions</span>
        <span className="text-muted-foreground text-sm">{error.message}</span>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const allTransactions = data.pages.flatMap((page) => page.transactions);

  if (!allTransactions.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="text-muted-foreground">No transactions found</span>
      </div>
    );
  }

  const {
    pendingTransactions,
    todayTransactions,
    thisWeekTransactions,
    olderTransactions,
  } = useFilteredTransactions(allTransactions);

  return (
    <div>
      <table className="w-full">
        <tbody className="flex flex-col gap-3">
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
        </tbody>
      </table>
      {hasNextPage && (
        <LoadMore
          onEndReached={() => !isFetchingNextPage && fetchNextPage()}
          isLoading={isFetchingNextPage}
        />
      )}
    </div>
  );
}

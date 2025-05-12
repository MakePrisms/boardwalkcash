import { useEffect, useRef } from 'react';
import { LinkWithViewTransition } from '~/lib/transitions';
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

function TransactionItem({ transaction }: { transaction: Transaction }) {
  return (
    // TODO: see why transition is not working
    <LinkWithViewTransition
      to={`/settings/transactions/${transaction.id}`}
      transition="slideLeft"
      applyTo="oldView"
      className="block transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <span className="font-medium">
            {transaction.direction === 'SEND' ? 'Sent' : 'Received'}
          </span>
          <span className="text-muted-foreground text-sm">
            {transaction.createdAt}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={`font-medium ${
              transaction.direction === 'SEND'
                ? 'text-destructive'
                : 'text-green-600'
            }`}
          >
            {transaction.direction === 'SEND' ? '-' : '+'}
            {transaction.amount.toString()}
          </span>
          <span className="text-muted-foreground text-sm">
            {transaction.state}
          </span>
        </div>
      </div>
    </LinkWithViewTransition>
  );
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

  const firstPage = data.pages[0];

  if (!firstPage.transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="text-muted-foreground">No transactions found</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data?.pages.map((page) => (
        <div key={`page-${page.transactions[0]?.id ?? 'empty'}`}>
          {page.transactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </div>
      ))}
      {hasNextPage && (
        <LoadMore
          onEndReached={() => !isFetchingNextPage && fetchNextPage()}
          isLoading={isFetchingNextPage}
        />
      )}
    </div>
  );
}

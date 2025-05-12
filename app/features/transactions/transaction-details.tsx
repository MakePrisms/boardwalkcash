import type { Transaction } from './transaction';

type Props = {
  transaction: Transaction;
};

export function TransactionDetails({ transaction }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Amount</span>
        <span
          className={
            transaction.direction === 'SEND'
              ? 'text-destructive'
              : 'text-green-600'
          }
        >
          {transaction.amount.toString()}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Type</span>
        <span>{transaction.type}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Status</span>
        <span>{transaction.state}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Created</span>
        <span>{transaction.createdAt}</span>
      </div>
      {transaction.pendingAt && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pending</span>
          <span>{transaction.pendingAt}</span>
        </div>
      )}
      {transaction.completedAt && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Completed</span>
          <span>{transaction.completedAt}</span>
        </div>
      )}
      {transaction.failedAt && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Failed</span>
          <span>{transaction.failedAt}</span>
        </div>
      )}
    </div>
  );
}

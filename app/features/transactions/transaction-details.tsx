import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanIcon,
  CheckIcon,
  ClockIcon,
  WalletIcon,
} from 'lucide-react';
import { PageContent } from '~/components/page';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import type { Account } from '~/features/accounts/account';
import type { Transaction } from '~/features/transactions/transaction';
import {
  useCancelCashuSendSwap,
  useUnresolvedCashuSendSwaps,
} from '../send/cashu-send-swap-hooks';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  const diff = now.getTime() - date.getTime();

  const timeString = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (diff < oneDay) {
    return `Today at ${timeString}`;
  }
  if (diff < 2 * oneDay) {
    return `Yesterday at ${timeString}`;
  }
  if (diff < oneWeek) {
    return `${date.toLocaleDateString(undefined, { weekday: 'long' })} at ${timeString}`;
  }
  return `${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} at ${timeString}`;
}

export function TransactionDetails({
  transaction,
  account,
}: { transaction: Transaction; account: Account }) {
  const { pending } = useUnresolvedCashuSendSwaps();
  console.log('all pending', pending);
  const pendingSwap = pending.find(
    (swap) => swap.transactionId === transaction.id,
  );
  const { mutate: cancelTransaction, isPending: isCancelling } =
    useCancelCashuSendSwap();
  const amount = transaction.amount;

  return (
    <PageContent className="mb-8 flex w-full max-w-md flex-col items-center justify-between gap-6">
      {/* Amount Section */}
      <div className="flex flex-col items-center gap-2">
        <div className="mb-2 rounded-full bg-card p-4">
          {transaction.direction === 'SEND' ? (
            <ArrowUpIcon size={32} />
          ) : (
            <ArrowDownIcon size={32} />
          )}
        </div>
        <MoneyWithConvertedAmount money={amount} />
      </div>

      {/* Details Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>{formatTimestamp(transaction.createdAt)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {transaction.state === 'COMPLETED' ? (
              <CheckIcon size={18} className="text-green-500" />
            ) : transaction.state === 'CANCELLED' ? (
              <BanIcon size={18} className="text-red-500" />
            ) : (
              <ClockIcon size={18} className="text-yellow-500" />
            )}
            <span className="capitalize">
              {transaction.state.toLowerCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <WalletIcon size={18} className="text-muted-foreground" />
            <span>{account?.name}</span>
          </div>
        </CardContent>
      </Card>

      <div className="h-[40px]">
        {pendingSwap && (
          <Button
            className="w-[100px]"
            onClick={() => cancelTransaction({ swap: pendingSwap })}
            loading={isCancelling}
          >
            Cancel
          </Button>
        )}
      </div>
    </PageContent>
  );
}

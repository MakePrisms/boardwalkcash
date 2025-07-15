import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanIcon,
  CheckIcon,
  ClockIcon,
  UndoIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { PageContent, PageFooter } from '~/components/page';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import type { Transaction } from '~/features/transactions/transaction';
import { useToast } from '~/hooks/use-toast';
import { LinkWithViewTransition } from '~/lib/transitions';
import { getErrorMessage } from '../shared/error';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import {
  isTransactionReversable,
  useReverseTransaction,
} from './transaction-hooks';

/**
 * Formats a timestamp into a human-readable relative time string with specific time of day.
 * Examples:
 * - "Today at 2:30 PM"
 * - "Yesterday at 9:15 AM"
 * - "Monday at 11:45 PM"
 * - "Jan 15 at 3:20 PM"
 */
function formatRelativeTimestampWithTime(timestamp: string): string {
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

const transactionIconMap = {
  COMPLETED: <CheckIcon size={18} className="text-green-500" />,
  REVERSED: <BanIcon size={18} className="text-red-500" />,
  FAILED: <XIcon size={18} className="text-red-500" />,
  DRAFT: <ClockIcon size={18} className="text-yellow-500" />,
  PENDING: <ClockIcon size={18} className="text-yellow-500" />,
};

function getTransactionIcon(transaction: Transaction) {
  return transactionIconMap[transaction.state];
}

function getTransactionLabel(transaction: Transaction) {
  if (transaction.state === 'REVERSED') {
    return 'Reclaimed';
  }
  if (transaction.state === 'DRAFT') {
    return 'Pending';
  }
  return transaction.state.toLowerCase();
}

export function TransactionDetails({
  transaction,
}: {
  transaction: Transaction;
}) {
  const { toast } = useToast();
  const [showOk, setShowOk] = useState(false);

  const {
    mutate: reverseTransaction,
    status: reverseTransactionMutationStatus,
  } = useReverseTransaction({
    onSuccess: () => setShowOk(true),
    onError: (error) => {
      toast({
        title: 'Error reclaiming',
        description: getErrorMessage(error),
      });
    },
  });

  // TODO: can this be simplified?
  const canReclaim = isTransactionReversable(transaction);
  const mutationHasRan = ['pending', 'success'].includes(
    reverseTransactionMutationStatus,
  );
  // The mutation has run, but we have not received the updated tx state from the db.
  const isWaitingForStateUpdate =
    mutationHasRan && transaction.state !== 'REVERSED';

  const shouldShowReclaimButton = canReclaim || isWaitingForStateUpdate;
  const isReclaimButtonLoading = mutationHasRan || isWaitingForStateUpdate;

  return (
    <>
      <PageContent className="mb-8 flex w-full max-w-md flex-col items-center justify-between gap-6">
        {/* Amount Section */}
        <div className="flex flex-col items-center gap-2">
          <div className="mb-2 rounded-full bg-card p-4">
            {transaction.reversedTransactionId ? (
              <UndoIcon size={32} />
            ) : transaction.direction === 'SEND' ? (
              <ArrowUpIcon size={32} />
            ) : (
              <ArrowDownIcon size={32} />
            )}
          </div>
          <MoneyWithConvertedAmount money={transaction.amount} />
        </div>

        {/* Details Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span>
                {formatRelativeTimestampWithTime(transaction.createdAt)}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {getTransactionIcon(transaction)}
              <span className="capitalize">
                {getTransactionLabel(transaction)}
              </span>
            </div>
            {showOk && (
              <PageFooter className="pb-14">
                <Button asChild className="w-[80px]">
                  <LinkWithViewTransition
                    to="/"
                    transition="slideDown"
                    applyTo="oldView"
                  >
                    OK
                  </LinkWithViewTransition>
                </Button>
              </PageFooter>
            )}
            {shouldShowReclaimButton && (
              <PageFooter className="pb-14">
                <Button
                  className="w-[100px]"
                  onClick={() => reverseTransaction({ transaction })}
                  loading={isReclaimButtonLoading}
                >
                  Reclaim
                </Button>
              </PageFooter>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}

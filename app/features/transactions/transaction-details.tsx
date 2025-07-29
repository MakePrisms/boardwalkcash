import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanIcon,
  CheckIcon,
  ClockIcon,
  UndoIcon,
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
import type {
  CashuReceiveQuoteTransactionDetails,
  CashuReceiveSwapTransactionDetails,
  CashuSendSwapTransactionDetails,
  CompletedCashuSendQuoteTransactionDetails,
  IncompleteCashuSendQuoteTransactionDetails,
  Transaction,
} from '~/features/transactions/transaction';
import { useToast } from '~/hooks/use-toast';
import { LinkWithViewTransition } from '~/lib/transitions';
import { useAccount } from '../accounts/account-hooks';
import { getDefaultUnit } from '../shared/currencies';
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

export function TransactionDetails({
  transaction,
}: {
  transaction: Transaction;
}) {
  const account = useAccount(transaction.accountId);
  const { toast } = useToast();

  const {
    mutate: reverseTransaction,
    isPending: isReversing,
    isSuccess: didReclaimMutationSucceed,
  } = useReverseTransaction({
    onError: (error) => {
      toast({
        title: 'Error reclaiming',
        description: getErrorMessage(error),
      });
    },
  });

  const isWaitingForStateUpdate =
    didReclaimMutationSucceed &&
    !['REVERSED', 'COMPLETED'].includes(transaction.state);

  const isReclaimInProgress = isReversing || isWaitingForStateUpdate;
  const shouldShowReclaimButton =
    isTransactionReversable(transaction) || isReclaimInProgress;

  // Log transaction details with proper formatting for each type
  const { type, direction, state, details } = transaction;
  const unit = getDefaultUnit(transaction.amount.currency);

  if (type === 'CASHU_LIGHTNING' && direction === 'SEND') {
    if (state === 'COMPLETED') {
      const completedDetails =
        details as CompletedCashuSendQuoteTransactionDetails;
      console.debug(
        `TX ${transaction.id.slice(0, 8)} [${type}_${direction}_${state}]:`,
        {
          amountReserved: completedDetails.amountReserved.toLocaleString({
            unit,
          }),
          totalAmount: completedDetails.amountSpent.toLocaleString({ unit }),
          amountToReceive: completedDetails.amountToReceive.toLocaleString({
            unit,
          }),
          lightningFeeReserve:
            completedDetails.lightningFeeReserve.toLocaleString({ unit }),
          cashuSendSwapFee: completedDetails.cashuSendSwapFee.toLocaleString({
            unit,
          }),
          totalFees: completedDetails.totalFees.toLocaleString({ unit }),
          lightningFee: completedDetails.lightningFee.toLocaleString({
            unit,
          }),
          paymentRequest: completedDetails.paymentRequest,
          preimage: completedDetails.preimage,
        },
      );
    } else {
      const incompleteDetails =
        details as IncompleteCashuSendQuoteTransactionDetails;
      console.debug(
        `TX ${transaction.id.slice(0, 8)} [${type}_${direction}_${state}]:`,
        {
          amountReserved: incompleteDetails.amountReserved.toLocaleString({
            unit,
          }),
          amountToReceive: incompleteDetails.amountToReceive.toLocaleString({
            unit,
          }),
          lightningFeeReserve:
            incompleteDetails.lightningFeeReserve.toLocaleString({ unit }),
          cashuSendSwapFee: incompleteDetails.cashuSendSwapFee.toLocaleString({
            unit,
          }),
          paymentRequest: incompleteDetails.paymentRequest,
        },
      );
    }
  }

  if (type === 'CASHU_LIGHTNING' && direction === 'RECEIVE') {
    const receiveDetails = details as CashuReceiveQuoteTransactionDetails;
    console.debug(
      `TX ${transaction.id.slice(0, 8)} [${type}_${direction}_${state}]:`,
      {
        amountReceived: receiveDetails.amountReceived.toLocaleString({ unit }),
        paymentRequest: receiveDetails.paymentRequest,
        description: receiveDetails.description,
      },
    );
  }

  if (type === 'CASHU_TOKEN' && direction === 'SEND') {
    const sendSwapDetails = details as CashuSendSwapTransactionDetails;
    console.debug(
      `TX ${transaction.id.slice(0, 8)} [${type}_${direction}_${state}]:`,
      {
        amountSpent: sendSwapDetails.amountSpent.toLocaleString({ unit }),
        amountToReceive: sendSwapDetails.amountToReceive.toLocaleString({
          unit,
        }),
        cashuSendSwapFee: sendSwapDetails.cashuSendSwapFee.toLocaleString({
          unit,
        }),
        cashuReceiveSwapFee: sendSwapDetails.cashuReceiveSwapFee.toLocaleString(
          {
            unit,
          },
        ),
        totalFees: sendSwapDetails.totalFees.toLocaleString({ unit }),
      },
    );
  }

  if (type === 'CASHU_TOKEN' && direction === 'RECEIVE') {
    const receiveSwapDetails = details as CashuReceiveSwapTransactionDetails;
    console.debug(
      `TX ${transaction.id.slice(0, 8)} [${type}_${direction}_${state}]:`,
      {
        amountReceived: receiveSwapDetails.amountReceived.toLocaleString({
          unit,
        }),
        tokenAmount: receiveSwapDetails.tokenAmount.toLocaleString({ unit }),
        cashuReceiveSwapFee:
          receiveSwapDetails.cashuReceiveSwapFee.toLocaleString({ unit }),
        totalFees: receiveSwapDetails.totalFees.toLocaleString({ unit }),
      },
    );
  }

  return (
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
            {transaction.state === 'COMPLETED' ? (
              <CheckIcon size={18} className="text-green-500" />
            ) : transaction.state === 'REVERSED' ? (
              <BanIcon size={18} className="text-red-500" />
            ) : (
              <ClockIcon size={18} className="text-yellow-500" />
            )}
            <span className="capitalize">
              {transaction.state === 'REVERSED'
                ? 'Reclaimed'
                : transaction.state.toLowerCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <WalletIcon size={18} className="text-muted-foreground" />
            <span>{account?.name}</span>
          </div>

          {transaction.reversedTransactionId && (
            <div className="flex flex-col gap-2 border-t pt-2">
              <div className="flex items-center gap-3">
                <UndoIcon size={16} />
                <span>Received from Reclaim</span>
              </div>
              <div className="flex items-center gap-3 pl-7">
                <LinkWithViewTransition
                  to={`/transactions/${transaction.reversedTransactionId}`}
                  transition="slideUp"
                  applyTo="newView"
                  className="text-muted-foreground text-sm underline"
                >
                  View original
                </LinkWithViewTransition>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="h-[40px]">
        {shouldShowReclaimButton && (
          <Button
            className="w-[100px]"
            onClick={() => reverseTransaction({ transaction })}
            loading={isReclaimInProgress}
          >
            Reclaim
          </Button>
        )}
      </div>
    </PageContent>
  );
}

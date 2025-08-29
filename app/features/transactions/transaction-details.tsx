import {
  BanIcon,
  CheckIcon,
  ClockIcon,
  LandmarkIcon,
  UndoIcon,
  XIcon,
} from 'lucide-react';

import { useEffect } from 'react';
import { PageContent, PageFooter } from '~/components/page';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import type {
  CashuLightningReceiveTransactionDetails,
  CashuTokenReceiveTransactionDetails,
  CashuTokenSendTransactionDetails,
  CompletedCashuLightningSendTransactionDetails,
  IncompleteCashuLightningSendTransactionDetails,
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
  useAcknowledgeTransaction,
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
  PENDING: <ClockIcon size={18} className="text-yellow-500" />,
};

function getTransactionIcon(transaction: Transaction) {
  if (transaction.state === 'DRAFT') {
    throw new Error('Transaction is in draft state');
  }
  return transactionIconMap[transaction.state];
}

function getTransactionLabel(transaction: Transaction) {
  if (transaction.state === 'REVERSED') {
    return 'Reclaimed';
  }
  return transaction.state.toLowerCase();
}

export function TransactionDetails({
  transaction,
  defaultShowOkayButton = false,
}: {
  transaction: Transaction;
  defaultShowOkayButton?: boolean;
}) {
  const account = useAccount(transaction.accountId);
  const { toast } = useToast();
  const { mutate: acknowledgeTransaction } = useAcknowledgeTransaction();

  useEffect(() => {
    if (transaction.acknowledgmentStatus === 'pending') {
      acknowledgeTransaction({ transaction });
    }
  }, [transaction, acknowledgeTransaction]);

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
  const shouldShowOkButton =
    (didReclaimMutationSucceed && !isWaitingForStateUpdate) ||
    (!shouldShowReclaimButton && defaultShowOkayButton);

  // Log transaction details with proper formatting for each type
  const { type, direction, state, details } = transaction;
  const unit = getDefaultUnit(transaction.amount.currency);

  if (type === 'CASHU_LIGHTNING' && direction === 'SEND') {
    if (state === 'COMPLETED') {
      const completedDetails =
        details as CompletedCashuLightningSendTransactionDetails;
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
          cashuSendFee: completedDetails.cashuSendFee.toLocaleString({
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
        details as IncompleteCashuLightningSendTransactionDetails;
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
          cashuSendFee: incompleteDetails.cashuSendFee.toLocaleString({
            unit,
          }),
          paymentRequest: incompleteDetails.paymentRequest,
          destinationDetails: incompleteDetails.destinationDetails,
        },
      );
    }
  }

  if (type === 'CASHU_LIGHTNING' && direction === 'RECEIVE') {
    const receiveDetails = details as CashuLightningReceiveTransactionDetails;
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
    const sendSwapDetails = details as CashuTokenSendTransactionDetails;
    console.debug(
      `TX ${transaction.id.slice(0, 8)} [${type}_${direction}_${state}]:`,
      {
        amountSpent: sendSwapDetails.amountSpent.toLocaleString({ unit }),
        amountToReceive: sendSwapDetails.amountToReceive.toLocaleString({
          unit,
        }),
        cashuSendFee: sendSwapDetails.cashuSendFee.toLocaleString({
          unit,
        }),
        cashuReceiveFee: sendSwapDetails.cashuReceiveFee.toLocaleString({
          unit,
        }),
        totalFees: sendSwapDetails.totalFees.toLocaleString({ unit }),
      },
    );
  }

  if (type === 'CASHU_TOKEN' && direction === 'RECEIVE') {
    const receiveSwapDetails = details as CashuTokenReceiveTransactionDetails;
    const tokenUnit = getDefaultUnit(receiveSwapDetails.tokenAmount.currency);
    console.debug(
      `TX ${transaction.id.slice(0, 8)} [${type}_${direction}_${state}]:`,
      {
        amountReceived: receiveSwapDetails.amountReceived.toLocaleString({
          unit,
        }),
        // NOTE: these should never be undefined, but there's a bug we need to fix
        // see https://github.com/MakePrisms/boardwalkcash/pull/541
        tokenAmount: receiveSwapDetails.tokenAmount?.toLocaleString({
          unit: tokenUnit,
        }),
        cashuReceiveFee: receiveSwapDetails.cashuReceiveFee?.toLocaleString({
          unit,
        }),
        totalFees: receiveSwapDetails.totalFees?.toLocaleString({ unit }),
      },
    );
  }

  return (
    <>
      <PageContent className="flex w-full max-w-md flex-1 flex-col items-center justify-between gap-8">
        <MoneyWithConvertedAmount money={transaction.amount} />

        {/* Details Section */}
        <div className="absolute top-0 right-0 bottom-0 left-0 mx-auto flex max-w-sm items-center justify-center">
          <Card className="m-4 w-full">
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
              <CardDescription className="flex items-center gap-2 text-muted-foreground text-sm">
                {formatRelativeTimestampWithTime(transaction.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {getTransactionIcon(transaction)}
                <span className="capitalize">
                  {getTransactionLabel(transaction)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <LandmarkIcon size={18} className="text-muted-foreground" />
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
                      to={{
                        pathname: `/transactions/${transaction.reversedTransactionId}`,
                        search: `redirectTo=/transactions/${transaction.id}`,
                      }}
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
        </div>
      </PageContent>
      {shouldShowReclaimButton && (
        <PageFooter className="pb-14">
          <Button
            className="w-[100px]"
            onClick={() => reverseTransaction({ transaction })}
            loading={isReclaimInProgress}
          >
            Reclaim
          </Button>
        </PageFooter>
      )}
      {shouldShowOkButton && (
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
    </>
  );
}

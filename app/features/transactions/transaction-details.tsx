import { type Token, getDecodedToken } from '@cashu/cashu-ts';
import {
  BanIcon,
  Banknote,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  InfoIcon,
  WalletIcon,
  XIcon,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { PageContent } from '~/components/page';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import type { Account } from '~/features/accounts/account';
import { type Currency, Money } from '~/lib/money';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import type { Transaction } from './types';

function formatTimestamp(timestamp: number): string {
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
  const isTokenClaimed = false;
  const amount = new Money({
    amount: transaction.amount,
    currency: 'USD' as Currency,
    unit: 'cent',
  });
  const [inspecting, setInspecting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const rawToken: Token | undefined = transaction.token
    ? getDecodedToken(transaction.token)
    : undefined;

  const handleCancel = () => {
    // Handle cancel logic here
    setShowCancelDialog(false);
  };

  return (
    <PageContent className="flex w-full max-w-md flex-col justify-between gap-6">
      {/* Amount Section */}
      <div className="flex flex-col items-center gap-2">
        <div className="mb-2 rounded-full bg-card p-4">
          {account.type === 'cashu' ? (
            <Banknote size={32} />
          ) : (
            <Zap size={32} />
          )}
        </div>
        <MoneyWithConvertedAmount money={amount} />
      </div>

      {/* Transaction & Actions Section */}
      <div className="flex flex-col gap-6">
        {/* Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span>{formatTimestamp(transaction.timestamp)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <InfoIcon size={18} className="text-muted-foreground" />
              <span className="capitalize">Status: {transaction.status}</span>
              {transaction.status === 'confirmed' ? (
                <CheckIcon size={16} className="ml-auto text-green-500" />
              ) : (
                <ClockIcon size={16} className="ml-auto text-yellow-500" />
              )}
            </div>

            <div className="flex items-center gap-3">
              <WalletIcon size={18} className="text-muted-foreground" />
              <span>Account: {account?.name}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions Section */}
        {transaction.token && (
          <div className="flex w-full flex-col gap-4">
            <div className="flex justify-between gap-2">
              <Button
                variant={isTokenClaimed ? 'default' : 'outline'}
                className="flex-1"
                onClick={() =>
                  isTokenClaimed ? undefined : setShowCancelDialog(true)
                }
              >
                {isTokenClaimed ? (
                  <>
                    <CheckIcon className="mr-2" size={18} /> Claim
                  </>
                ) : (
                  <>
                    <BanIcon className="mr-2" size={18} /> Cancel
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setInspecting(true)}
                className="flex-1"
              >
                <EyeIcon className="mr-2" size={18} /> Inspect
              </Button>
            </div>

            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <DialogContent className="font-primary" showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Cancel Transaction</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to cancel this transaction? This
                    action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelDialog(false)}
                  >
                    No, keep it
                  </Button>
                  <Button variant="destructive" onClick={handleCancel}>
                    Yes, cancel it
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {inspecting && (
              <Card>
                <CardContent>
                  <div className="mb-4">
                    <p className="mb-2 font-medium text-sm">Token:</p>
                    <p className="break-all rounded bg-muted p-2 text-xs">
                      {transaction.token}
                    </p>
                  </div>
                  {rawToken && (
                    <>
                      <div className="mb-4">
                        <p className="mb-2 font-medium text-sm">Mint:</p>
                        <p className="break-all rounded bg-muted p-2 text-xs">
                          {rawToken.mint}
                        </p>
                      </div>
                      <div className="mb-4">
                        <p className="mb-2 font-medium text-sm">Proofs:</p>
                        <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                          {JSON.stringify(rawToken.proofs, null, 2)}
                        </pre>
                      </div>

                      {rawToken.memo && (
                        <div className="mb-4">
                          <p className="mb-2 font-medium text-sm">Memo:</p>
                          <p className="break-all rounded bg-muted p-2 text-xs">
                            {rawToken.memo}
                          </p>
                        </div>
                      )}

                      {rawToken.unit && (
                        <div className="mb-4">
                          <p className="mb-2 font-medium text-sm">Unit:</p>
                          <p className="break-all rounded bg-muted p-2 text-xs">
                            {rawToken.unit}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setInspecting(false)}
                    className="w-full"
                  >
                    <XIcon className="mr-2" size={18} /> Close
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageContent>
  );
}

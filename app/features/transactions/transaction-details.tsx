import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  WalletIcon,
} from 'lucide-react';
import { useCopyToClipboard } from 'usehooks-ts';
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
import { useToast } from '~/hooks/use-toast';
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

function shortenText(text: string): string {
  if (text.length <= 10) return text;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

export function TransactionDetails({
  transaction,
  account,
}: { transaction: Transaction; account: Account }) {
  const amount = transaction.amount;
  const [_, copy] = useCopyToClipboard();
  const { toast } = useToast();

  const handleCopy = async (text: string) => {
    const success = await copy(text);
    if (success) {
      toast({
        description: 'Copied to clipboard',
      });
    } else {
      toast({
        variant: 'destructive',
        description: 'Failed to copy to clipboard',
      });
    }
  };

  return (
    <PageContent className="flex w-full max-w-md flex-col justify-between gap-6">
      {/* Amount Section */}
      <div className="flex flex-col items-center gap-2">
        <div className="mb-2 rounded-full bg-card p-4">
          {transaction.direction === 'out' ? (
            <ArrowUpIcon size={32} />
          ) : (
            <ArrowDownIcon size={32} />
          )}
        </div>
        <MoneyWithConvertedAmount money={amount} />
      </div>

      {/* Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>{formatTimestamp(transaction.timestampMs)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {transaction.status === 'confirmed' ? (
              <CheckIcon size={18} className="text-green-500" />
            ) : (
              <ClockIcon size={18} className="text-yellow-500" />
            )}
            <span className="capitalize">{transaction.status}</span>
          </div>

          <div className="flex items-center gap-3">
            <WalletIcon size={18} className="text-muted-foreground" />
            <span>{account?.name}</span>
          </div>

          {transaction.data && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <p className="">{shortenText(transaction.data)}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleCopy(transaction.data)}
              >
                <CopyIcon size={14} />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 
         NOTE: this commented out stuff is to add extra functionality like cancelling a transaction 
         or inspecting tokens.I think we will end up wanting this, but left it out for now to 
         keep simple.
      */}
      {/* Actions Section */}
      {/* {transaction.data && (
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
                      {transaction.data}
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
        )} */}
    </PageContent>
  );
}

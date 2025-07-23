import { AlertCircle, Clipboard, ClockIcon } from 'lucide-react';
import {
  ClosePageButton,
  Page,
  PageContent,
  PageFooter,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { useSendStore } from '~/features/send';
import { useCashuSendQuote } from '~/features/send/cashu-send-quote-hooks';
import { SuccessfulSendPage } from '~/features/send/succesful-send-page';
import { getDefaultUnit } from '~/features/shared/currencies';
import { MoneyWithConvertedAmount } from '~/features/shared/money-with-converted-amount';
import { LinkWithViewTransition } from '~/lib/transitions';
import type { Route } from './+types/_protected.send.cashu_.bolt11.$cashuSendQuoteId';

const formatDestination = (destination: string) => {
  if (destination && destination.length > 20) {
    return `${destination.slice(0, 5)}...${destination.slice(-5)}`;
  }
  return destination;
};

function TransactionDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function SendCashuBolt11({ params }: Route.ComponentProps) {
  const { data } = useCashuSendQuote(params.cashuSendQuoteId);
  const destination = useSendStore((s) => s.destinationDisplay);
  const formattedDestination = formatDestination(
    destination ?? data.paymentRequest,
  );

  if (data?.state === 'PAID') {
    return (
      <SuccessfulSendPage
        amountSpent={data.amountSpent}
        account={data.account}
        destination={formattedDestination}
        amountReceived={data.amountToReceive}
        feesPaid={data.amountSpent.subtract(data.amountToReceive)}
      />
    );
  }

  if (data?.state === 'PENDING') {
    return (
      <Page>
        <PageHeader>
          <PageHeaderTitle>Paying</PageHeaderTitle>
          <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
        </PageHeader>
        <PageContent className="relative flex flex-col items-center gap-12">
          <MoneyWithConvertedAmount money={data.amountToReceive} />
          <div className="fade-in-0 flex w-full animate-in flex-col gap-12 place-self-center duration-300">
            <div className="mb-2 flex justify-center">
              <ClockIcon className="h-16 w-16 text-yellow-500" />
            </div>
            <div className="flex w-full flex-col gap-6">
              <TransactionDetail label="Account" value={data.account.name} />
              <TransactionDetail
                label="Destination"
                value={formattedDestination}
              />
              <TransactionDetail
                label="Recipient will get"
                value={data.amountToReceive.toLocaleString({
                  unit: getDefaultUnit(data.amountToReceive.currency),
                })}
              />
              <TransactionDetail
                label="Estimated fees"
                value={data.lightningFeeReserve.toLocaleString({
                  unit: getDefaultUnit(data.lightningFeeReserve.currency),
                })}
              />
            </div>
          </div>
        </PageContent>
        <PageFooter className="pb-14">
          <Button asChild className="w-[80px]">
            <LinkWithViewTransition
              to="/"
              transition="slideDown"
              applyTo="oldView"
            >
              Close
            </LinkWithViewTransition>
          </Button>
        </PageFooter>
      </Page>
    );
  }

  if (data?.state === 'EXPIRED') {
    return (
      <Page>
        <PageHeader>
          <PageHeaderTitle>Payment Expired</PageHeaderTitle>
          <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
        </PageHeader>
        <PageContent className="relative flex flex-col items-center gap-12">
          <MoneyWithConvertedAmount money={data.amountToReceive} />
          <div className="fade-in-0 flex w-full animate-in flex-col gap-12 place-self-center duration-300">
            <div className="mb-2 flex justify-center">
              <ClockIcon className="h-16 w-16 text-orange-500" />
            </div>
            <div className="flex w-full flex-col gap-6">
              <TransactionDetail label="Account" value={data.account.name} />
              <TransactionDetail
                label="Destination"
                value={formattedDestination}
              />
              <TransactionDetail
                label="Amount attempted"
                value={data.amountToReceive.toLocaleString({
                  unit: getDefaultUnit(data.amountToReceive.currency),
                })}
              />
            </div>
          </div>
        </PageContent>
        <PageFooter className="pb-14">
          <Button asChild className="w-[80px]">
            <LinkWithViewTransition
              to="/send"
              transition="slideDown"
              applyTo="oldView"
            >
              Ok
            </LinkWithViewTransition>
          </Button>
        </PageFooter>
      </Page>
    );
  }

  if (data?.state === 'FAILED') {
    return (
      <Page>
        <PageHeader>
          <PageHeaderTitle>Payment Failed</PageHeaderTitle>
          <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
        </PageHeader>
        <PageContent className="relative flex flex-col items-center gap-12">
          <MoneyWithConvertedAmount money={data.amountToReceive} />
          <div className="fade-in-0 flex w-full animate-in flex-col gap-12 place-self-center duration-300">
            <div className="mb-2 flex justify-center">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <div className="flex w-full flex-col gap-6">
              <TransactionDetail label="Account" value={data.account.name} />
              <TransactionDetail
                label="Destination"
                value={formattedDestination}
              />
              <TransactionDetail
                label="Amount attempted"
                value={data.amountToReceive.toLocaleString({
                  unit: getDefaultUnit(data.amountToReceive.currency),
                })}
              />
              {data.failureReason && (
                <TransactionDetail label="Reason" value={data.failureReason} />
              )}
            </div>
          </div>
        </PageContent>
        <PageFooter className="pb-14">
          <Button asChild className="w-[80px]">
            <LinkWithViewTransition
              to="/send"
              transition="slideDown"
              applyTo="oldView"
            >
              Ok
            </LinkWithViewTransition>
          </Button>
        </PageFooter>
      </Page>
    );
  }

  // vvvv TODO: remove this below and handle the other states where needed vvvvv

  const { account, ...rest } = data;

  return (
    <div className="relative h-dvh overflow-y-scroll p-4">
      Something probably went wrong. If you see this please report it with the
      following data:
      {data && (
        <pre className="relative mt-4 overflow-auto rounded bg-card p-4 text-sm">
          <Button
            className="absolute top-2 right-4 h-auto w-auto"
            onClick={() =>
              navigator.clipboard.writeText(JSON.stringify(rest, null, 2))
            }
            variant="ghost"
            size="icon"
          >
            <Clipboard size={26} className="text-muted-foreground" />
          </Button>
          {JSON.stringify(rest, null, 2)}
        </pre>
      )}
    </div>
  );
}

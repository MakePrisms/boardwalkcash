import { CheckCircle } from 'lucide-react';
import {
  ClosePageButton,
  Page,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { MoneyWithConvertedAmount } from '~/features/shared/money-with-converted-amount';
import type { Money } from '~/lib/money';
import type { Account } from '../accounts/account';
import { getDefaultUnit } from '../shared/currencies';

function TransactionDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

type Props = {
  amount: Money;
  account: Account;
  destination: string;
  feesPaid?: Money;
};

export function SuccessfulSendPage({
  amount,
  account,
  destination,
  feesPaid,
}: Props) {
  return (
    <Page>
      <PageHeader>
        <PageHeaderTitle>Success</PageHeaderTitle>
        <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
      </PageHeader>
      <PageContent className="relative flex flex-col items-center gap-12">
        <MoneyWithConvertedAmount money={amount} />
        <div className="fade-in-0 flex w-full animate-in flex-col gap-12 place-self-center duration-300">
          <div className="mb-2 flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <div className="flex w-full flex-col gap-8">
            <TransactionDetail label="Account" value={account.name} />
            <TransactionDetail label="Destination" value={destination} />
            {feesPaid && (
              <TransactionDetail
                label="Fees paid"
                value={feesPaid.toLocaleString({
                  unit: getDefaultUnit(feesPaid.currency),
                })}
              />
            )}
          </div>
        </div>
      </PageContent>
    </Page>
  );
}

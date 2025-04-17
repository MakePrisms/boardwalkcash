import { CheckCircle } from 'lucide-react';
import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { MoneyWithConvertedAmount } from '~/features/shared/money-with-converted-amount';
import type { Money } from '~/lib/money';
import type { Account } from '../accounts/account';

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
};

export function SuccessfulReceivePage({ amount, account }: Props) {
  return (
    <>
      <PageHeader>
        <PageHeaderTitle>
          {account.type === 'cashu' ? 'Receive Ecash' : 'Receive'}
        </PageHeaderTitle>
        <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
      </PageHeader>
      <PageContent className="relative flex flex-col items-center gap-12">
        <MoneyWithConvertedAmount money={amount} />
        <div className="fade-in-0 flex w-full animate-in flex-col gap-8 place-self-center duration-300">
          <div className="mb-2 flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <div className="flex w-full flex-col gap-8">
            <TransactionDetail label="Account" value={account.name} />
            {account.type === 'cashu' && (
              <TransactionDetail
                label="Mint"
                value={account.mintUrl
                  .replace('https://', '')
                  .replace('http://', '')}
              />
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}

import {
  PaymentRequest,
  type PaymentRequestTransport,
  PaymentRequestTransportType,
} from '@cashu/cashu-ts';
import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Redirect } from '~/components/redirect';
import type { Money } from '~/lib/money';
import { accounts } from '~/routes/_protected._index';
import { type Account, AccountSelector } from '../accounts/account-selector';

export const getCashuRequest = (
  account: Account & { type: 'cashu' },
  opts?: {
    amount?: Money;
    description?: string;
    unit?: 'sat' | 'usd';
    singleUse?: boolean;
  },
): PaymentRequest => {
  const transports: PaymentRequestTransport[] = [
    {
      type: PaymentRequestTransportType.POST,
      target: '',
      tags: [],
    },
    {
      type: PaymentRequestTransportType.NOSTR,
      target: '',
      tags: [],
    },
  ];

  return new PaymentRequest(
    transports,
    account.id,
    opts?.amount?.toNumber(opts?.unit),
    opts?.unit,
    [account.mintUrl],
    opts?.description,
    opts?.singleUse,
  );
};

export default function ReusablePaymentRequest({
  accountId,
}: { accountId?: string }) {
  const account = accounts.find((a) => a.id === accountId);
  if (accountId && !account) {
    return <Redirect to="/receive" />;
  }

  let paymentRequest: string;
  if (account?.type === 'cashu') {
    paymentRequest = getCashuRequest(account, {
      unit: account.currency === 'USD' ? 'usd' : 'sat',
      description: 'test',
    }).toEncodedRequest();
  } else {
    paymentRequest = 'daimgood21@getalby.com';
  }

  return (
    <>
      <PageHeader>
        <ClosePageButton
          to="/receive"
          transition="slideDown"
          applyTo="oldView"
        />
        <PageHeaderTitle>Payment Request</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        {account ? (
          <>
            <div>Account: {account.name}</div>
            <div>Payment Request: {paymentRequest}</div>
          </>
        ) : (
          <AccountSelector
            accounts={accounts}
            selectedAccount={accounts[0]}
            onSelect={() => console.log('account selected')}
          />
        )}
      </PageContent>
    </>
  );
}

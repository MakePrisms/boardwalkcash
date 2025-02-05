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
import type { Currency, CurrencyUnit, Money } from '~/lib/money';
import type { Account } from '../accounts/account-selector';

export const getCashuRequest = <C extends Currency>(
  account: Account<C> & { type: 'cashu' },
  opts?: {
    amount?: Money<C>;
    description?: string;
    unit?: Extract<CurrencyUnit<C>, 'sat' | 'usd'>;
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
  account,
}: { account: Account }) {
  let paymentRequest: string;
  if (account.type === 'cashu') {
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
        <div>Account: {account.name}</div>
        <div>Payment Request: {paymentRequest}</div>
      </PageContent>
    </>
  );
}

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
import { getCashuProtocolUnit } from '~/lib/cashu';
import type { Money } from '~/lib/money';
import type { Account } from '../accounts/account';

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
  account,
}: { account: Account }) {
  let paymentRequest: string;
  if (account.type === 'cashu') {
    paymentRequest = getCashuRequest(account, {
      unit: getCashuProtocolUnit(account.currency),
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

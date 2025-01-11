import { useSearchParams } from '@remix-run/react';
import { Page } from '~/components/page';
import ReusablePaymentRequest from '~/features/receive/reusable-payment-request';

export default function ReceiveRequest() {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('accountId');

  return (
    <Page>
      <ReusablePaymentRequest accountId={accountId ?? undefined} />
    </Page>
  );
}

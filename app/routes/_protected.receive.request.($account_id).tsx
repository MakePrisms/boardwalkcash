import { useParams } from '@remix-run/react';
import { Page } from '~/components/page';
import ReusablePaymentRequest from '~/features/receive/reusable-payment-request';

export default function ReceiveRequest() {
  const { account_id } = useParams();

  return (
    <Page>
      <ReusablePaymentRequest accountId={account_id} />
    </Page>
  );
}

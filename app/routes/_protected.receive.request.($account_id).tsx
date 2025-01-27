import { useParams } from '@remix-run/react';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import ReusablePaymentRequest from '~/features/receive/reusable-payment-request';
import { accounts } from './_protected._index';

export default function ReceiveRequest() {
  const { account_id } = useParams();
  if (!account_id) {
    return <Redirect to="/receive" logMessage="No account id provided" />;
  }

  const account = accounts.find((a) => a.id === account_id);
  if (!account) {
    return <Redirect to="/receive" logMessage="Account not found" />;
  }

  return (
    <Page>
      <ReusablePaymentRequest account={account} />
    </Page>
  );
}

import { useParams } from 'react-router';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { useAccounts } from '~/features/accounts/account-hooks';
import ReusablePaymentRequest from '~/features/receive/reusable-payment-request';

export default function ReceiveRequest() {
  const { accountId } = useParams();
  const { data: accounts } = useAccounts();

  if (!accountId) {
    return <Redirect to="/receive" logMessage="No account id provided" />;
  }

  const account = accounts.find((a) => a.id === accountId);
  if (!account) {
    return <Redirect to="/receive" logMessage="Account not found" />;
  }

  return (
    <Page>
      <ReusablePaymentRequest account={account} />
    </Page>
  );
}

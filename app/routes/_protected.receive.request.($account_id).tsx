import { useParams } from 'react-router';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { useAccounts } from '~/features/accounts/account-hooks';
import ReusablePaymentRequest from '~/features/receive/reusable-payment-request';

export default function ReceiveRequest() {
  const { account_id } = useParams();
  const { data: accounts } = useAccounts();

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

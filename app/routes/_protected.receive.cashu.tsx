import { useSearchParams } from 'react-router';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { useAccount } from '~/features/accounts/account-hooks';
import ReceiveCashu from '~/features/receive/receive-cashu';
import { useReceiveStore } from '~/features/receive/receive-provider';

export default function ReceiveCashuPage() {
  const [searchParams] = useSearchParams();
  // TODO: put onchain data in receive store not in query params
  const onchainOnly = searchParams.get('onchain') === 'true';

  const receiveAmount = useReceiveStore((state) => state.amount);
  const receiveAccountId = useReceiveStore((state) => state.accountId);
  const receiveAccount = useAccount(receiveAccountId);

  if (receiveAccount.type !== 'cashu') {
    return <Redirect to="/receive" />;
  }

  // For onchain-only flow, we don't need an amount, just a valid cashu account
  if (!onchainOnly && !receiveAmount) {
    return <Redirect to="/receive" />;
  }

  return (
    <Page>
      <ReceiveCashu
        amount={onchainOnly ? null : receiveAmount}
        account={receiveAccount}
        onchainOnly={onchainOnly}
      />
    </Page>
  );
}

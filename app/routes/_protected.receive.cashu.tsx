import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import ReceiveCashu from '~/features/receive/receive-cashu';
import { useReceiveStore } from '~/features/receive/receive-provider';

export default function ReceiveCashuPage() {
  const receiveAmount = useReceiveStore((state) => state.amount);
  const receiveAccount = useReceiveStore((state) => state.account);
  const shouldRedirect = !receiveAmount || receiveAccount.type !== 'cashu';

  if (shouldRedirect) {
    return <Redirect to="/receive" />;
  }

  return (
    <Page>
      <ReceiveCashu amount={receiveAmount} account={receiveAccount} />
    </Page>
  );
}

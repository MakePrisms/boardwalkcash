import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { useReceiveStore } from '~/features/receive/receive-provider';
import { ReceiveSpark } from '~/features/receive/receive-spark';
import type { Money } from '~/lib/money';

export default function ReceiveSparkPage() {
  const receiveAmount = useReceiveStore((state) => state.amount);
  const receiveAccount = useReceiveStore((state) => state.account);
  const shouldRedirect = !receiveAmount || receiveAccount.type !== 'spark';

  if (shouldRedirect) {
    return <Redirect to="/receive" />;
  }

  // TODO: this check shouldn't be necessary
  if (receiveAmount?.currency !== 'BTC') {
    throw new Error('Receive amount must be in BTC');
  }

  return (
    <Page>
      <ReceiveSpark
        amount={receiveAmount as Money<'BTC'>}
        account={receiveAccount}
      />
    </Page>
  );
}

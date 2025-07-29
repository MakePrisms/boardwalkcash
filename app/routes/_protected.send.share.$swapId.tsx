import { Page } from '~/components/page';
import { Redirect, RedirectWithViewTransition } from '~/components/redirect';
import { useCashuSendSwap } from '~/features/send/cashu-send-swap-hooks';
import { ShareCashuToken } from '~/features/send/share-cashu-token';
import { getCashuProtocolUnit } from '~/lib/cashu';
import type { Route } from './+types/_protected.send.share.$swapId';

export default function SendShare({ params }: Route.ComponentProps) {
  const { data: swap } = useCashuSendSwap(params.swapId);

  if (swap.state === 'COMPLETED') {
    return (
      <RedirectWithViewTransition
        to={`/transactions/${swap.transactionId}?redirectTo=/`}
        options={{
          transition: 'fade',
          applyTo: 'newView',
        }}
      />
    );
  }

  if (swap.state !== 'PENDING') {
    return <Redirect to="/send" logMessage="Swap not pending" />;
  }

  const token = {
    mint: swap.account.mintUrl,
    proofs: swap.proofsToSend,
    unit: getCashuProtocolUnit(swap.amountToSend.currency),
  };

  return (
    <Page>
      <ShareCashuToken token={token} />
    </Page>
  );
}

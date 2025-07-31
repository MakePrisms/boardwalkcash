import { Redirect } from '~/components/redirect';
import {
  useCashuSendSwap,
  useTrackCashuSendSwap,
} from '~/features/send/cashu-send-swap-hooks';
import { ShareCashuToken } from '~/features/send/share-cashu-token';
import { getCashuProtocolUnit } from '~/lib/cashu';
import { useNavigateWithViewTransition } from '~/lib/transitions';
import type { Route } from './+types/_protected.send.share.$swapId';

export default function SendShare({ params }: Route.ComponentProps) {
  const navigate = useNavigateWithViewTransition();

  const { data: swap } = useCashuSendSwap(params.swapId);

  useTrackCashuSendSwap({
    id: params.swapId,
    onCompleted: (swap) => {
      navigate(`/transactions/${swap.transactionId}?redirectTo=/`, {
        transition: 'fade',
        applyTo: 'newView',
      });
    },
  });

  // Don't redirect if we're about to handle completion or if already completed
  // This prevents the race condition where state updates before onCompleted callback
  if (swap.state !== 'PENDING' && swap.state !== 'COMPLETED') {
    return <Redirect to="/send" logMessage="Swap not pending" />;
  }

  const token = {
    mint: swap.account.mintUrl,
    proofs: swap.proofsToSend,
    unit: getCashuProtocolUnit(swap.amountToSend.currency),
  };

  return <ShareCashuToken token={token} />;
}

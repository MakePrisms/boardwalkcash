import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useCashuSendSwap } from '~/features/send/cashu-send-swap-hooks';
import { ShareCashuToken } from '~/features/send/share-cashu-token';
import { SuccessfulSendPage } from '~/features/send/succesful-send-page';
import { getCashuProtocolUnit } from '~/lib/cashu';
import type { Route } from './+types/_protected.send.share.$swapId';

export default function SendShare({ params }: Route.ComponentProps) {
  const { swapId } = params;

  const {
    data: swap,
    status,
    error,
    account,
  } = useCashuSendSwap({
    id: swapId,
  });

  if (status === 'pending') {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <Redirect
        to="/404?message=Cashu%20send%20not%20fount"
        logMessage="Error fetching swap"
      />
    );
  }

  if (swap.state === 'COMPLETED') {
    if (!account) {
      throw new Error(`Account not found for Cashu send swap ${swapId}`);
    }

    return (
      <SuccessfulSendPage
        amount={swap.totalAmount}
        account={account}
        destination={'ecash'}
        feesPaid={swap.sendSwapFee.add(swap.receiveSwapFee)}
      />
    );
  }

  if (swap.state !== 'PENDING') {
    return <Redirect to="/send" logMessage="Swap not pending" />;
  }

  const token = {
    mint: swap.mintUrl,
    proofs: swap.proofsToSend,
    unit: getCashuProtocolUnit(swap.amountToSend.currency),
  };

  return (
    <Page>
      <ShareCashuToken token={token} />
    </Page>
  );
}

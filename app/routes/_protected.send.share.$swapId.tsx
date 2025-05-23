import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { useAccountsCache } from '~/features/accounts/account-hooks';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useCashuSendSwap } from '~/features/send/cashu-send-swap-hooks';
import { ShareCashuToken } from '~/features/send/share-cashu-token';
import { SuccessfulSendPage } from '~/features/send/succesful-send-page';
import { getCashuProtocolUnit } from '~/lib/cashu';
import type { Route } from './+types/_protected.send.share.$swapId';

export default function SendShare({ params }: Route.ComponentProps) {
  const accountsCache = useAccountsCache();
  const { swapId } = params;

  const { swap } = useCashuSendSwap({
    id: swapId,
  });

  if (!swap) {
    return <LoadingScreen />;
  }

  if (swap.state === 'COMPLETED') {
    const account = accountsCache.get(swap.accountId);
    if (!account) {
      throw new Error(`Account not found for id: ${swap.accountId}`);
    }
    return (
      <SuccessfulSendPage
        amount={swap.amountToSend}
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

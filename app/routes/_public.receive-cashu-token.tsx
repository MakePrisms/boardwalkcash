import { useLocation } from 'react-router';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { ReceiveCashuToken } from '~/features/receive';
import { PublicReceiveCashuToken } from '~/features/receive/receive-cashu-token';
import { useAuthState } from '~/features/user/auth';
import { WalletSetup } from '~/features/wallet/wallet';
import { extractCashuToken } from '~/lib/cashu';

/**
 * Determines whether the token should be claimed automatically.
 * If the user was redirected from the auth page and they are a guest, we should auto claim the token.
 */
function useShouldAutoClaim() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  return searchParams.get('autoClaim') === 'true';
}

export default function ReceiveCashuTokenPage() {
  const location = useLocation();
  const token = extractCashuToken(location.hash);
  const autoClaim = useShouldAutoClaim();
  const { loading, user } = useAuthState();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!token) {
    return <Redirect to="/receive" />;
  }

  return (
    <Page>
      {user ? (
        <WalletSetup authUser={user}>
          <ReceiveCashuToken token={token} autoClaimToken={autoClaim} />
        </WalletSetup>
      ) : (
        <PublicReceiveCashuToken token={token} />
      )}
    </Page>
  );
}

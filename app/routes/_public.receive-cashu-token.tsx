import { useLocation } from 'react-router';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { ReceiveCashuToken } from '~/features/receive';
import { PublicReceiveCashuToken } from '~/features/receive/receive-cashu-token';
import { useAuthState } from '~/features/user/auth';
import { WalletSetup } from '~/features/wallet/wallet';
import { useUrlNavigation } from '~/hooks/use-url-navigation';
import { extractCashuToken } from '~/lib/cashu';

/**
 * Determines whether the token should be claimed automatically.
 * If the user was redirected from the auth page and they are a guest, we should auto claim the token.
 */
function useShouldAutoClaim() {
  // NOTE: I'm wondering if we should do this differently.
  // ...
  // I think we should still do the url navigation that maintains the token hash
  // through the navigation of the auth routes, but for tracking whether
  // we should autoclaim or not, we shouldn't use the url navigation with the
  // redirected=1 query param.

  // Instead, I think that we should use local storage to track whether we
  // should autoclaim the specific token or not.
  // If the token that is currently in the URL is also marked to autoclaim in
  // local storage, then we should autoclaim the token when on the ReceiveToken view.

  // Then we can move all the auto claim logic into the receive-cashu-token components

  // wdyt Josip?.

  const { isRedirected } = useUrlNavigation();
  return isRedirected();
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

  if (!user) {
    return <PublicReceiveCashuToken token={token} />;
  }

  return (
    <WalletSetup authUser={user}>
      <Page>
        <ReceiveCashuToken token={token} autoClaimToken={autoClaim} />
      </Page>
    </WalletSetup>
  );
}

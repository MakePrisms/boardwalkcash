import { useLocation } from 'react-router';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { ReceiveCashuToken } from '~/features/receive';
import { useAuthState } from '~/features/user/auth';
import { useGetCashuTokenFromUrlHash } from '~/hooks/use-get-cashu-token-from-url-hash';

/**
 * Determines whether the token should be claimed automatically.
 * If the user was redirected from the auth page and they are a guest, we should auto claim the token.
 */
function useShouldAutoClaim() {
  const isGuest = !useAuthState().user?.email;
  const location = useLocation();
  return isGuest && location.search.includes('redirected=1');
}

export default function ReceiveCashuTokenPage() {
  const { token } = useGetCashuTokenFromUrlHash();
  const autoClaim = useShouldAutoClaim();

  if (!token) {
    return <Redirect to="/receive" />;
  }

  return (
    <Page>
      <ReceiveCashuToken token={token} autoClaim={autoClaim} />
    </Page>
  );
}

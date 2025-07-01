import { useLocation } from 'react-router';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { PublicReceiveCashuToken } from '~/features/receive/receive-cashu-token';
import { useAuthState } from '~/features/user/auth';
import { extractCashuToken } from '~/lib/cashu';

export default function ReceiveCashuTokenPage() {
  const location = useLocation();
  const token = extractCashuToken(location.hash);
  const { loading, isLoggedIn } = useAuthState();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isLoggedIn) {
    return (
      <Redirect
        to={{
          ...location,
          pathname: '/receive/cashu/token',
        }}
        logMessage="User is logged in. Redirecting to protected receive cashu token page."
      />
    );
  }

  if (!token) {
    return (
      <Redirect
        to="/signup"
        logMessage="No token in URL. Redirecting to sign up page."
      />
    );
  }

  return (
    <Page>
      <PublicReceiveCashuToken token={token} />
    </Page>
  );
}

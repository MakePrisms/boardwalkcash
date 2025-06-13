import { Outlet, useLocation } from 'react-router';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useAuthState } from '~/features/user/auth';
import { useGetCashuTokenFromUrlHash } from '~/hooks/use-get-cashu-token-from-url-hash';

export default function AuthRoute() {
  const location = useLocation();
  const { loading, isLoggedIn, user } = useAuthState();
  const { encodedToken: tokenFromUrl } = useGetCashuTokenFromUrlHash();

  console.debug('Rendering auth layout', {
    location: location.pathname,
    loading,
    isLoggedIn,
    user,
    tokenFromUrl,
  });

  if (loading) {
    return <LoadingScreen />;
  }

  if (isLoggedIn) {
    if (tokenFromUrl) {
      return (
        <Redirect to={`/receive/cashu-token?redirected=1#${tokenFromUrl}`}>
          <LoadingScreen />
        </Redirect>
      );
    }
    return (
      <Redirect to="/" logMessage="Redirecting from auth page to /">
        <LoadingScreen />
      </Redirect>
    );
  }

  return <Outlet />;
}

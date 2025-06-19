import { Outlet, useLocation } from 'react-router';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useAuthState } from '~/features/user/auth';

export default function AuthRoute() {
  const location = useLocation();
  const { loading, isLoggedIn, user } = useAuthState();

  console.debug('Rendering auth layout', {
    location: location.pathname,
    loading,
    isLoggedIn,
    user,
  });

  if (loading) {
    return <LoadingScreen />;
  }

  if (isLoggedIn) {
    const searchParams = new URLSearchParams(location.search);
    const redirectTo = searchParams.get('redirectTo') || '/';

    return (
      <Redirect
        to={{ ...location, pathname: redirectTo }}
        logMessage="Redirecting from auth page"
      >
        <LoadingScreen />
      </Redirect>
    );
  }

  return <Outlet />;
}

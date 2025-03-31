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
    return (
      <Redirect to="/" logMessage="Redirecting from auth page to /">
        <LoadingScreen />
      </Redirect>
    );
  }

  return <Outlet />;
}

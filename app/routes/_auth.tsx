import { Outlet, useLocation } from 'react-router';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useAuthState } from '~/features/user/auth';
import { useUrlNavigation } from '~/hooks/use-url-navigation';

export default function AuthRoute() {
  const location = useLocation();
  const { loading, isLoggedIn, user } = useAuthState();
  const { buildRedirect } = useUrlNavigation();

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
      <Redirect to={buildRedirect('/')} logMessage="Redirecting from auth page">
        <LoadingScreen />
      </Redirect>
    );
  }

  return <Outlet />;
}

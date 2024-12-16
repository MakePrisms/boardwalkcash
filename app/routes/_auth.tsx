import { Outlet, useLocation, useNavigate } from '@remix-run/react';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useAuthState } from '~/features/user/auth';
import { useEffectNoStrictMode } from '~/lib/use-effect-no-strict-mode';

export default function AuthRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, isLoggedIn, user } = useAuthState();

  console.debug('Rendering auth layout', {
    location: location.pathname,
    loading,
    isLoggedIn,
    user,
  });

  useEffectNoStrictMode(() => {
    if (isLoggedIn) {
      console.debug('Redirecting from auth page to /');
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  if (loading || isLoggedIn) {
    return <LoadingScreen />;
  }

  return <Outlet />;
}

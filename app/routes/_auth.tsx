import { useOpenSecret } from '@opensecret/react';
import { Outlet, useNavigate } from '@remix-run/react';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useEffectNoStrictMode } from '~/lib/use-effect-no-strict-mode';

export default function AuthRoute() {
  const navigate = useNavigate();
  const {
    auth: { user, loading },
  } = useOpenSecret();
  const isLoggedIn = !!user;

  useEffectNoStrictMode(() => {
    if (isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  if (loading || isLoggedIn) {
    return <LoadingScreen />;
  }

  return <Outlet />;
}

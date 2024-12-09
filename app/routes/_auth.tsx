import { useOpenSecret } from '@opensecret/react';
import { Outlet, useLocation, useNavigate } from '@remix-run/react';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useEffectNoStrictMode } from '~/lib/use-effect-no-strict-mode';

export default function AuthRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    auth: { user, loading },
  } = useOpenSecret();
  const isLoggedIn = !!user;
  console.log('_auth.tsx - location: ', location.pathname);
  console.log('isLoggedIn: ', isLoggedIn);
  console.log('user: ', user);

  useEffectNoStrictMode(
    () => {
      if (isLoggedIn) {
        console.log('++++++++ redirecting from auth to /');
        navigate('/');
      }
    },
    [isLoggedIn, navigate],
    '_auth.tsx - home redirect',
  );

  if (loading || isLoggedIn) {
    return <LoadingScreen />;
  }

  return <Outlet />;
}

import { useOpenSecret } from '@opensecret/react';
import { Outlet, useNavigate } from '@remix-run/react';
import { useEffect } from 'react';
import { LoadingScreen } from '~/features/loading/LoadingScreen';

export default function AuthRoute() {
  const navigate = useNavigate();
  const {
    auth: { user, loading },
  } = useOpenSecret();
  const isLoggedIn = !!user;

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  if (loading || isLoggedIn) {
    return <LoadingScreen />;
  }

  return <Outlet />;
}

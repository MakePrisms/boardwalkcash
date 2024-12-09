import { useOpenSecret } from '@opensecret/react';
import { Outlet, useNavigate } from '@remix-run/react';
import { useEffect } from 'react';
import { LoadingScreen } from '~/features/loading/LoadingScreen';

export default function ProtectedRoute() {
  const navigate = useNavigate();
  const {
    auth: { user, loading },
  } = useOpenSecret();
  const isLoggedIn = !!user;

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/login');
    }
  }, [loading, isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return <LoadingScreen />;
  }

  return <Outlet />;
}

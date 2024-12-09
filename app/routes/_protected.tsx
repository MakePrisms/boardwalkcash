import { useOpenSecret } from '@opensecret/react';
import { Outlet, useLocation, useNavigate } from '@remix-run/react';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useEffectNoStrictMode } from '~/lib/use-effect-no-strict-mode';

export default function ProtectedRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    auth: { user, loading },
  } = useOpenSecret();
  const isLoggedIn = !!user;
  const isGuestUser = isLoggedIn ? !user.user.email : undefined;
  const hasVerifiedEmail = isLoggedIn && user.user.email_verified;
  const shouldVerifyEmail = isGuestUser === false && !hasVerifiedEmail;
  const isVerifyEmailRoute = location.pathname === '/verify-email';
  const shouldRedirectToVerifyEmail = shouldVerifyEmail && !isVerifyEmailRoute;

  useEffectNoStrictMode(() => {
    if (!loading && !isLoggedIn) {
      navigate('/signup');
    }
  }, [loading, isLoggedIn, navigate]);

  useEffectNoStrictMode(() => {
    if (shouldRedirectToVerifyEmail) {
      navigate('/verify-email');
    }
  }, [shouldRedirectToVerifyEmail, navigate]);

  if (!isLoggedIn || shouldRedirectToVerifyEmail) {
    return <LoadingScreen />;
  }

  return <Outlet />;
}

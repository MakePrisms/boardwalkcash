import { Outlet, useLocation, useNavigate } from '@remix-run/react';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useAuthState } from '~/features/user/auth';
import { shouldVerifyEmail as shouldUserVerifyEmail } from '~/features/user/user';
import { UserProvider } from '~/features/user/user-provider';
import { useEffectNoStrictMode } from '~/lib/use-effect-no-strict-mode';

export default function ProtectedRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, isLoggedIn, user } = useAuthState();
  const shouldVerifyEmail = user ? shouldUserVerifyEmail(user) : false;
  const isVerifyEmailRoute = location.pathname.startsWith('/verify-email');
  const shouldRedirectToVerifyEmail = shouldVerifyEmail && !isVerifyEmailRoute;

  console.debug('Rendering protected layout', {
    location: location.pathname,
    loading,
    user: user,
    shouldVerifyEmail,
    isVerifyEmailRoute,
    shouldRedirectToVerifyEmail,
  });

  useEffectNoStrictMode(() => {
    if (!loading && !isLoggedIn) {
      console.debug('Redirecting from protected page to signup');
      navigate('/signup');
    }
  }, [loading, isLoggedIn, navigate]);

  useEffectNoStrictMode(() => {
    if (shouldRedirectToVerifyEmail) {
      console.debug('Redirecting from protected page to verify email');
      navigate('/verify-email');
    }
  }, [shouldRedirectToVerifyEmail, navigate]);

  if (!isLoggedIn || shouldRedirectToVerifyEmail) {
    return <LoadingScreen />;
  }

  return (
    <UserProvider user={user}>
      <Outlet />
    </UserProvider>
  );
}

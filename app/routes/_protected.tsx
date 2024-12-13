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

  // console.log('_protected.tsx - location: ', location.pathname);
  // console.log('user: ', user);
  // console.log('loading: ', loading);
  // console.log('isGuestUser: ', isGuestUser);
  // console.log('hasVerifiedEmail: ', hasVerifiedEmail);
  // console.log('shouldVerifyEmail: ', shouldVerifyEmail);
  // console.log('isVerifyEmailRoute: ', isVerifyEmailRoute);
  // console.log('shouldRedirectToVerifyEmail: ', shouldRedirectToVerifyEmail);

  useEffectNoStrictMode(
    () => {
      if (!loading && !isLoggedIn) {
        console.log('++++++++ redirecting from protected to signup');
        navigate('/signup');
      }
    },
    [loading, isLoggedIn, navigate],
    '_protected.tsx - signup redirect',
  );

  useEffectNoStrictMode(
    () => {
      if (shouldRedirectToVerifyEmail) {
        console.log('++++++++ redirecting from protected to verify email');
        navigate('/verify-email');
      }
    },
    [shouldRedirectToVerifyEmail, navigate],
    '_protected.tsx - verify email redirect',
  );

  if (!isLoggedIn || shouldRedirectToVerifyEmail) {
    return <LoadingScreen />;
  }

  return <Outlet />;
}

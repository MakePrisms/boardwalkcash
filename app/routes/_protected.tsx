import { Outlet, useLocation } from 'react-router';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { PublicReceiveCashuToken } from '~/features/receive/receive-cashu-token';
import { type AuthUser, useAuthState } from '~/features/user/auth';
import { WalletSetup } from '~/features/wallet/wallet';
import { useGetCashuTokenFromUrlHash } from '~/hooks/use-get-cashu-token-from-url-hash';

const shouldUserVerifyEmail = (user: AuthUser) => {
  const isGuest = !user.email;
  return !isGuest && !user.email_verified;
};

// prevent loader from being revalidated
export function shouldRevalidate() {
  return false;
}

export default function ProtectedRoute() {
  const location = useLocation();
  const { loading, isLoggedIn, user } = useAuthState();
  const shouldRedirectToSignup = !loading && !isLoggedIn;
  const shouldVerifyEmail = user ? shouldUserVerifyEmail(user) : false;
  const isVerifyEmailRoute = location.pathname.startsWith('/verify-email');
  const shouldRedirectToVerifyEmail = shouldVerifyEmail && !isVerifyEmailRoute;
  const { token } = useGetCashuTokenFromUrlHash();

  console.debug('Rendering protected layout', {
    location: location.pathname,
    loading,
    isLoggedIn,
    user,
    shouldRedirectToSignup,
    shouldVerifyEmail,
    isVerifyEmailRoute,
    shouldRedirectToVerifyEmail,
  });

  if (shouldRedirectToSignup) {
    if (token) {
      return <PublicReceiveCashuToken token={token} />;
    }
    return (
      <Redirect
        to="/signup"
        logMessage="Redirecting from protected page to signup"
      >
        <LoadingScreen />
      </Redirect>
    );
  }

  if (shouldRedirectToVerifyEmail) {
    return (
      <Redirect
        to="/verify-email"
        logMessage="Redirecting from protected page to verify email"
      >
        <LoadingScreen />
      </Redirect>
    );
  }

  if (!isLoggedIn) {
    return <LoadingScreen />;
  }

  return (
    <WalletSetup authUser={user}>
      <Outlet />
    </WalletSetup>
  );
}

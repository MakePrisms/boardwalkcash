import { Outlet, useLocation } from 'react-router';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { type AuthUser, useAuthState } from '~/features/user/auth';
import { WalletSetup } from '~/features/wallet/wallet';

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
    return (
      <Redirect
        to={`/signup?redirectTo=${location.pathname}`}
        logMessage="Redirecting from protected page to signup"
      >
        <LoadingScreen />
      </Redirect>
    );
  }

  if (shouldRedirectToVerifyEmail) {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('redirectTo', location.pathname);

    return (
      <Redirect
        to={{
          ...location,
          pathname: '/verify-email',
          search: searchParams.toString(),
        }}
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

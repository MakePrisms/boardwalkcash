import type { LoaderFunction } from '@remix-run/node';
import { Outlet, useLocation } from '@remix-run/react';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useAuthState } from '~/features/user/auth';
import { shouldVerifyEmail as shouldUserVerifyEmail } from '~/features/user/user';
import { UserProvider } from '~/features/user/user-provider';
import { exchangeRateService } from '~/lib/exchange-rate/exchange-rate-service';

export const loader: LoaderFunction = async () => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['exchangeRate'],
    // queryFn: () => fetchRates('average'),
    queryFn: ({ signal }) =>
      exchangeRateService.getRates({ tickers: ['BTC-USD'], signal }),
  });

  return { dehydratedState: dehydrate(queryClient) };
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
    <UserProvider user={user}>
      <Outlet />
    </UserProvider>
  );
}

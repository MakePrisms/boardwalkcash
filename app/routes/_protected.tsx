import type { LoaderFunction } from '@remix-run/node';
import { Outlet, useLoaderData, useLocation } from '@remix-run/react';
import { Redirect } from '~/components/redirect';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { useAuthState } from '~/features/user/auth';
import { shouldVerifyEmail as shouldUserVerifyEmail } from '~/features/user/user';
import { UserProvider } from '~/features/user/user-provider';
import { type ExchangeRates, fetchRates } from '~/lib/exchange-rate';

export const loader: LoaderFunction = async (): Promise<{
  rates: ExchangeRates;
}> => {
  const rateSource = 'average';
  try {
    const rates = await fetchRates(rateSource);
    console.log('Rates in loader: ', rates);
    return { rates };
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // TODO: maybe we should have a cached exchange rate and then a fallback as a last resort
    return { rates: { BTCUSD: 100_000, timestamp: Date.now() } };
  }
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
  const { rates } = useLoaderData<{ rates: ExchangeRates }>();

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
      <Outlet context={{ rates }} />
    </UserProvider>
  );
}

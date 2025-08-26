import { type ClientLoaderFunctionArgs, redirect } from 'react-router';
import { LoadingScreen } from '~/features/loading/LoadingScreen';
import { cashuAuthStore } from '~/features/shared/cashu-mint-authentication';

/**
 * Client loader that handles OIDC callback after the user has authenticated with the auth provider.
 * It completes the auth flow by exchanging the code for tokens, stores the tokens, then
 * redirects to the home page.
 */
export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const url = new URL(request.url);
  const callbackUrl = url.href;

  const { completeOidcFlow } = cashuAuthStore.getState();
  await completeOidcFlow(callbackUrl);
  console.log('oidc-callback completed successfully');

  // TODO: starting the oidc flow should save the user's current location and redirect back to that page after the oidc flow is complete

  // Redirect to home page after successful authentication
  throw redirect('/');
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <LoadingScreen />;
}

export default function OidcCallback() {
  return null;
}

import { useLocation } from 'react-router';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { ReceiveCashuToken } from '~/features/receive';
import { extractCashuToken } from '~/lib/cashu';

/**
 * Determines whether the token should be claimed automatically.
 * If the user was redirected from the auth page and they are a guest, we should auto claim the token.
 */
function useShouldAutoClaim() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  return searchParams.get('autoClaim') === 'true';
}

export default function ProtectedReceiveCashuToken() {
  const location = useLocation();
  const token = extractCashuToken(location.hash);
  const autoClaim = useShouldAutoClaim();

  if (!token) {
    return (
      <Redirect
        to="/receive"
        logMessage="No token in URL. Redirecting to receive page."
      />
    );
  }

  return (
    <Page>
      <ReceiveCashuToken token={token} autoClaimToken={autoClaim} />
    </Page>
  );
}

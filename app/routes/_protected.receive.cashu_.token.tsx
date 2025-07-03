import { useLocation, useSearchParams } from 'react-router';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { ReceiveCashuToken } from '~/features/receive';
import { extractCashuToken } from '~/lib/cashu';

/**
 * Determines whether the token should be claimed automatically.
 * If the user was redirected from the auth page and they are a guest, we should auto claim the token.
 */
function useShouldAutoClaim() {
  const [searchParams] = useSearchParams();
  return searchParams.get('autoClaim') === 'true';
}

export default function ProtectedReceiveCashuToken() {
  const location = useLocation();
  const token = extractCashuToken(location.hash);
  const autoClaim = useShouldAutoClaim();
  const [searchParams] = useSearchParams();
  const claimToAccountId = searchParams.get('accountId') ?? undefined;

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
      <ReceiveCashuToken
        token={token}
        autoClaimToken={autoClaim}
        claimToAccountId={claimToAccountId}
      />
    </Page>
  );
}

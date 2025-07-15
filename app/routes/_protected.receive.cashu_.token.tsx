import { useLocation, useSearchParams } from 'react-router';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { ReceiveCashuToken } from '~/features/receive';
import { extractCashuToken } from '~/lib/cashu';

export default function ProtectedReceiveCashuToken() {
  const location = useLocation();
  const token = extractCashuToken(location.hash);
  const [searchParams] = useSearchParams();
  const autoClaim = searchParams.get('autoClaim') === 'true';
  const selectedAccountId = searchParams.get('selectedAccountId') ?? undefined;

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
        preferredReceiveAccountId={selectedAccountId}
      />
    </Page>
  );
}

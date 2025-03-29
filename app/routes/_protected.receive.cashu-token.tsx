import { getDecodedToken } from '@cashu/cashu-ts';
import { useLocation } from '@remix-run/react';
import { useMemo } from 'react';
import { Page } from '~/components/page';
import { Redirect } from '~/components/redirect';
import { ReceiveCashuToken } from '~/features/receive';

export default function ReceiveCashuTokenPage() {
  const location = useLocation();
  // tokens are passed in as a hash fragment so that they are not visible in the URL
  const token = location.hash.slice(1);

  const decodedToken = useMemo(() => {
    if (!token) {
      return null;
    }

    try {
      return getDecodedToken(token);
    } catch {
      return null;
    }
  }, [token]);

  if (!decodedToken) {
    return <Redirect to="/receive" />;
  }

  return (
    <Page>
      <ReceiveCashuToken token={decodedToken} />
    </Page>
  );
}

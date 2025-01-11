import { getDecodedToken } from '@cashu/cashu-ts';
import { useLocation } from '@remix-run/react';
import { Redirect } from '~/components/redirect';
import { ReceiveCashuToken } from '~/features/receive';

export default function ReceiveCashuTokenPage() {
  const location = useLocation();
  // tokens are passed in as a hash fragment so that they are not visible in the URL
  const token = location.hash.slice(1);

  if (!token) {
    return <Redirect to="/receive" />;
  }

  try {
    const decoded = getDecodedToken(token);
    return <ReceiveCashuToken token={decoded} />;
  } catch {
    // invalid token
    return <Redirect to="/receive" />;
  }
}

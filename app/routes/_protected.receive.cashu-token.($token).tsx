import { getDecodedToken } from '@cashu/cashu-ts';
import { useLocation } from '@remix-run/react';
import { Redirect } from '~/components/redirect';
import ReceiveToken from '~/features/receive/receive-cashu-token';

export default function ReceiveCashuToken() {
  const location = useLocation();
  // tokens are passed in as a hash fragment so that they are not visible in the URL
  const token = location.hash.slice(1); // Remove the # from the start

  if (!token) {
    return <Redirect to="/receive" />;
  }

  try {
    const decoded = getDecodedToken(token);
    return <ReceiveToken token={decoded} />;
  } catch {
    // invalid token
    return <Redirect to="/receive" />;
  }
}

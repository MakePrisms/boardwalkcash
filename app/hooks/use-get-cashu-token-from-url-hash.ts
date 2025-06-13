import { getDecodedToken } from '@cashu/cashu-ts';
import { useLocation } from 'react-router';
import { extractCashuToken } from '~/lib/cashu';

/**
 * Reads the token from the hash fragment and provides a helper to append the hash to any path.
 */
export function useGetCashuTokenFromUrlHash() {
  const location = useLocation();

  // tokens are passed in as a hash fragment so that they are not visible in the URL
  // if we don't do this, there is a risk the tokens would be logged on our servers
  const encodedToken = extractCashuToken(location.hash);
  const token = encodedToken ? getDecodedToken(encodedToken) : null;

  function withTokenHash(path: string) {
    if (!token) return path;
    // Remove any existing hash from the path
    const [basePath] = path.split('#');

    return `${basePath}#${encodedToken}`;
  }

  return { token, encodedToken, withTokenHash };
}

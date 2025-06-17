import { type To, useLocation } from 'react-router';
import useLocationData from './use-location';

/**
 * Comprehensive hook for URL parameter management and navigation
 * Handles parameter preservation, redirection logic, and declarative navigation
 */
export function useUrlNavigation() {
  const location = useLocation();
  const { origin } = useLocationData();

  /**
   * Preserves current URL parameters and hash when navigating to a new location
   * @param to - The destination to navigate to
   * @param excludeParams - Optional array of parameter names to exclude from preservation
   */
  function preserveParams(to: To, excludeParams: string[] = []): To {
    // Handle string paths by converting to URL for parsing
    let targetPath: string;
    let targetSearch: string;
    let targetHash: string;

    if (typeof to === 'string') {
      const url = new URL(to, origin);
      targetPath = url.pathname;
      targetSearch = url.search;
      targetHash = url.hash;
    } else {
      targetPath = to.pathname || '';
      targetSearch = to.search || '';
      targetHash = to.hash || '';
    }

    // Combine current search params with target params
    const currentParams = new URLSearchParams(location.search);
    const targetParams = new URLSearchParams(targetSearch);

    // Remove excluded parameters from current params
    for (const excludeParam of excludeParams) {
      currentParams.delete(excludeParam);
    }

    // Add target params first, then current params (current params take precedence)
    for (const [key, value] of targetParams) {
      if (!currentParams.has(key)) {
        currentParams.set(key, value);
      }
    }

    const combinedSearch = currentParams.toString();
    const currentHash = location.hash;
    const preservedHash = targetHash || currentHash;

    if (preservedHash !== currentHash) {
      console.warn('Preserved hash does not match current hash', {
        preservedHash,
        currentHash: location.hash,
      });
    }

    return {
      pathname: targetPath,
      search: combinedSearch ? `?${combinedSearch}` : '',
      hash: preservedHash,
    };
  }

  /**
   * Builds a redirection URL from the redirectTo query parameter and removes it
   * @param fallback - The fallback destination if no redirectTo parameter is found
   * @returns The redirection URL with redirectTo parameter removed
   */
  function buildRedirect(fallback: To = '/'): To {
    const searchParams = new URLSearchParams(location.search);
    const redirectTo = searchParams.get('redirectTo');

    if (!redirectTo) {
      return fallback;
    }

    // Parse the redirectTo parameter as a To object
    const redirectUrl = new URL(redirectTo, origin);
    const redirectDestination: To = {
      pathname: redirectUrl.pathname,
      search: redirectUrl.search,
      hash: redirectUrl.hash,
    };

    // Use preserveParams to combine with current params, excluding redirectTo
    return preserveParams(redirectDestination, ['redirectTo']);
  }
  /**
   * Adds a redirection marker to indicate navigation was due to redirection
   * The marker is a URL parameter 'redirected=1' that helps track when users
   * are navigated programmatically (e.g., after authentication) vs direct navigation
   * @param to - The destination to navigate to
   * @returns The destination with redirection marker added
   */
  function withRedirection(to: To): To {
    const destination = typeof to === 'string' ? { pathname: to } : { ...to };

    const params = new URLSearchParams(destination.search || '');
    params.set('redirected', '1');

    return {
      ...destination,
      search: `?${params.toString()}`,
    };
  }

  /**
   * Checks if the current navigation was due to redirection
   * @returns true if the current location includes the redirection marker
   */
  function isRedirected(): boolean {
    return location.search.includes('redirected=1');
  }

  /**
   * Removes the redirection marker from the current URL
   * @returns The current location without the redirection marker
   */
  function clearRedirection(): To {
    const params = new URLSearchParams(location.search);
    params.delete('redirected');

    return {
      pathname: location.pathname,
      search: params.toString() ? `?${params.toString()}` : '',
      hash: location.hash,
    };
  }

  return {
    preserveParams,
    buildRedirect,
    withRedirection,
    isRedirected,
    clearRedirection,
  };
}

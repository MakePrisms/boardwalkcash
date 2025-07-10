import { UserManager } from 'oidc-client-ts';

/**
 * Clear Authentication Session for NUT-21
 * Contains OAuth 2.0 tokens and metadata from an OIDC provider
 */
export type ClearAuthSession = {
  /** The access token (JWT) */
  accessToken: string;
  /** The refresh token for obtaining new access tokens */
  refreshToken?: string;
  /** When the access token expires (timestamp in seconds) */
  expiresAt?: number;
  /** The mint URL this token is associated with */
  mintUrl: string;
  /** OIDC authority that issued the token */
  authority: string;
  /** Client ID used for authentication */
  clientId: string;
};

/**
 * Check if the current token is expired or will expire within the next 5 minutes
 */
export const isTokenExpired = (session: ClearAuthSession): boolean => {
  if (!session.expiresAt) {
    return false; // If no expiration time, assume token is still valid
  }

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const bufferTime = 5; // 5 seconds buffer

  console.debug(
    `token for ${session.mintUrl} expires in ${session.expiresAt - now - bufferTime} seconds`,
  );

  return session.expiresAt <= now + bufferTime;
};

/**
 * Custom error for when refresh token is invalid/expired and session needs to be cleared
 */
export class RefreshTokenInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefreshTokenInvalidError';
  }
}

/**
 * Refresh the access token using the refresh token
 * Returns a new ClearAuthSession with updated tokens
 * Throws RefreshTokenInvalidError if the refresh token is invalid/expired
 */
export const refreshClearAuthToken = async (
  session: ClearAuthSession,
): Promise<ClearAuthSession> => {
  if (!session.refreshToken) {
    throw new Error('No refresh token available');
  }

  // Fetch OIDC configuration to get token endpoint
  const oidcConfigUrl = `${session.authority}/.well-known/openid-configuration`;
  const oidcConfig = await fetch(oidcConfigUrl).then((res) => res.json());

  if (!oidcConfig.token_endpoint) {
    throw new Error('Token endpoint not found in OIDC configuration');
  }

  // Prepare refresh token request
  const tokenRequestBody = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
    client_id: session.clientId,
  });

  try {
    const response = await fetch(oidcConfig.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = `Token refresh failed: ${response.status} ${response.statusText}. ${
        errorData.error_description || errorData.error || ''
      }`;

      // Check if this is a refresh token that's invalid/expired (common 400 errors)
      // TODO: can we be more specific here?
      if (
        response.status === 400 &&
        (errorData.error === 'invalid_grant' ||
          errorMessage.includes('Token is not active') ||
          errorMessage.includes('invalid_grant') ||
          errorMessage.includes('token expired'))
      ) {
        console.warn(
          'Refresh token is invalid/expired, session needs to be cleared',
        );
        throw new RefreshTokenInvalidError(errorMessage);
      }

      throw new Error(errorMessage);
    }

    const tokenData = await response.json();

    // Calculate expiration time
    const expiresAt = tokenData.expires_in
      ? Math.floor(Date.now() / 1000) + tokenData.expires_in
      : session.expiresAt;

    return {
      ...session,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || session.refreshToken, // Use new refresh token if provided
      expiresAt,
    };
  } catch (error) {
    // Re-throw RefreshTokenInvalidError as-is
    if (error instanceof RefreshTokenInvalidError) {
      throw error;
    }

    console.error('Failed to refresh token:', error);
    throw new Error(
      `Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * Get a valid access token, refreshing if necessary
 * Returns the session with a valid access token
 */
export const getValidToken = async (
  session: ClearAuthSession,
): Promise<ClearAuthSession> => {
  if (isTokenExpired(session)) {
    return await refreshClearAuthToken(session);
  }
  return session;
};

/**
 * Start OIDC authentication flow for a mint by fetching the OIDC configuration from
 * the mint's OpenID discovery endpoint, storing the needed callback data in sessionStorage,
 * and then redirecting the user to the OIDC provider's authorization endpoint.
 */
export const startClearAuthFlow = async ({
  mintUrl,
  openIdDiscoveryUrl,
  clientId,
  redirectUri,
}: {
  mintUrl: string;
  openIdDiscoveryUrl: string;
  clientId: string;
  redirectUri: string;
}) => {
  const oidcConfig = await fetch(openIdDiscoveryUrl).then((res) => res.json());
  const authority = oidcConfig.issuer;

  // Store config in sessionStorage for the callback
  // TODO: is this necessary? Or is sessionStorage the right way? Should we pass
  // in a storage interface to use? What data do we need when completing the auth flow?
  sessionStorage.setItem('oidc_authority', authority);
  sessionStorage.setItem('oidc_client_id', clientId);
  sessionStorage.setItem('oidc_mint_url', mintUrl);
  sessionStorage.setItem('oidc_redirect_uri', redirectUri);

  const userManager = new UserManager({
    authority: authority,
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile',
  });

  await userManager.signinRedirect();
};

/**
 * Complete the OIDC authentication flow by exchanging the authorization code for an access token.
 * This function should be called after the user is redirected back to the application from the OIDC provider.
 * It retrieves the authorization code from the URL parameters, exchanges it for an access token,
 * and returns the ClearAuthSession containing the access token, refresh token, and other metadata.
 */
export const completeClearAuthFlow = async (): Promise<ClearAuthSession> => {
  const authority = sessionStorage.getItem('oidc_authority');
  const client_id = sessionStorage.getItem('oidc_client_id');
  const mintUrl = sessionStorage.getItem('oidc_mint_url');

  if (!authority || !client_id || !mintUrl) {
    throw new Error('OIDC configuration missing from sessionStorage');
  }

  const redirect_uri = sessionStorage.getItem('oidc_redirect_uri');

  if (!redirect_uri) {
    throw new Error('Redirect URI is missing from sessionStorage');
  }

  const userManager = new UserManager({
    authority,
    client_id,
    redirect_uri,
    response_type: 'code',
    scope: 'openid profile',
  });

  try {
    await userManager.signinCallback();
    const user = await userManager.getUser();

    if (!user) {
      throw new Error('No user data received from OIDC provider');
    }

    return {
      accessToken: user.access_token,
      refreshToken: user.refresh_token,
      expiresAt: user.expires_at,
      mintUrl,
      authority,
      clientId: client_id,
    };
  } catch (error) {
    // Clear potentially corrupted session storage on error
    sessionStorage.removeItem('oidc_authority');
    sessionStorage.removeItem('oidc_client_id');
    sessionStorage.removeItem('oidc_mint_url');
    sessionStorage.removeItem('oidc_redirect_uri');
    throw error;
  }
};

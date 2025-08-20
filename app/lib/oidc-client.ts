import { jwtDecode } from 'jwt-decode';
import ky from 'ky';

/**
 * OIDC Discovery Configuration Response
 */
type OidcConfiguration = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  [key: string]: unknown;
};

/**
 * OAuth 2.0 Token Response
 */
type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  [key: string]: unknown;
};

/**
 * Build authorization URL and store session data
 * Returns the authorization URL to redirect to
 */
export async function startOidcFlow({
  openIdDiscoveryUrl,
  clientId,
  redirectUri,
  scope = 'openid profile',
}: {
  openIdDiscoveryUrl: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
}): Promise<URL> {
  const oidcConfig = await ky.get(openIdDiscoveryUrl).json<OidcConfiguration>();

  if (!oidcConfig.authorization_endpoint) {
    throw new Error('Authorization endpoint not found in OIDC configuration');
  }

  // Generate security parameters
  const state = generateRandomString();
  const { codeVerifier, codeChallenge } = await generatePKCE();

  // Store only the security parameters that need to persist
  sessionStorage.setItem('oidc_state', state);
  sessionStorage.setItem('oidc_code_verifier', codeVerifier);

  // Store the OIDC configuration for later use when completing the flow
  sessionStorage.setItem('oidc_authority', oidcConfig.issuer);
  sessionStorage.setItem('oidc_client_id', clientId);
  sessionStorage.setItem('oidc_redirect_uri', redirectUri);

  // Build authorization URL
  const authUrl = new URL(oidcConfig.authorization_endpoint);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return authUrl;
}

/**
 * Complete the authorization flow by exchanging code for tokens
 * @param callbackUrl - The current URL after the OIDC callback
 */
export async function completeOidcFlow(callbackUrl: string): Promise<{
  accessToken: string;
  authority: string;
  clientId: string;
  refreshToken?: string;
  expiresAt?: number;
}> {
  // Retrieve the security parameters from storage
  const storedState = sessionStorage.getItem('oidc_state');
  const codeVerifier = sessionStorage.getItem('oidc_code_verifier');

  // Retrieve the OIDC configuration
  const authority = sessionStorage.getItem('oidc_authority');
  const clientId = sessionStorage.getItem('oidc_client_id');
  const redirectUri = sessionStorage.getItem('oidc_redirect_uri');

  try {
    if (
      !storedState ||
      !codeVerifier ||
      !authority ||
      !clientId ||
      !redirectUri
    ) {
      throw new Error('OIDC security parameters missing from storage');
    }

    // Parse callback URL parameters
    const url = new URL(callbackUrl);
    const urlParams = url.searchParams;
    const code = urlParams.get('code');
    const callbackState = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    // Handle authorization errors
    if (error) {
      const message = errorDescription || error;
      throw new Error(`OIDC authorization error: ${message}`);
    }

    if (!code) {
      throw new Error('Authorization code not found in callback URL');
    }

    // Verify state parameter (CSRF protection)
    if (callbackState !== storedState) {
      throw new Error('State parameter mismatch - possible CSRF attack');
    }

    const tokenEndpoint = await getTokenEndpoint(authority);

    // Exchange authorization code for tokens
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    const tokenData = await ky
      .post(tokenEndpoint, {
        body: tokenRequestBody,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      .json<TokenResponse>();

    if (!tokenData.access_token) {
      throw new Error('Access token not received from token endpoint');
    }

    // Calculate expiration time
    let expiresAt: number | undefined;

    // Keycloak is returning expires_in as 0 even the the JWT itslef has an expiration
    // TODO: make sure correct expiration is used
    if (tokenData.expires_in && tokenData.expires_in > 0) {
      expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
    } else {
      const jwtExpiration = jwtDecode(tokenData.access_token).exp;
      expiresAt = jwtExpiration || undefined;
    }

    // Clean up session storage
    clearSessionData();

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      authority,
      clientId,
      expiresAt,
    };
  } catch (error) {
    clearSessionData();
    throw error;
  }
}

/**
 * Refresh an access token using a refresh token
 * Returns updated token information
 */
export async function refreshOidcSession({
  authority,
  clientId,
  refreshToken: refreshTokenValue,
}: {
  authority: string;
  clientId: string;
  refreshToken: string;
}): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}> {
  if (!refreshTokenValue) {
    throw new Error('No refresh token provided');
  }

  const tokenEndpoint = await getTokenEndpoint(authority);

  // Prepare refresh token request
  const tokenRequestBody = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenValue,
    client_id: clientId,
  });

  const tokenData = await ky
    .post(tokenEndpoint, {
      body: tokenRequestBody,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    .json<TokenResponse>();

  if (!tokenData.access_token) {
    throw new Error('Access token not received from token endpoint');
  }

  // Calculate expiration time
  let expiresAt: number | undefined;

  // Keycloak is returning expires_in as 0 even the the JWT itslef has an expiration
  // TODO: make sure correct expiration is used
  if (tokenData.expires_in && tokenData.expires_in > 0) {
    expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
  } else {
    const jwtExpiration = jwtDecode(tokenData.access_token).exp;
    expiresAt = jwtExpiration || undefined;
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
  };
}

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

/**
 * Generate base64url-encoded string from array buffer
 */
function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate PKCE code verifier and challenge for enhanced security
 * According to RFC 7636, code verifier must be 43-128 characters long
 * and use unreserved characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 */
async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  // Generate 32 random bytes and encode as base64url (43 characters)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = base64urlEncode(array.buffer);

  // Create code challenge using SHA256
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = base64urlEncode(digest);

  return { codeVerifier, codeChallenge };
}

async function getTokenEndpoint(authority: string): Promise<string> {
  const oidcConfig = await ky
    .get(`${authority}/.well-known/openid-configuration`)
    .json<OidcConfiguration>();
  return oidcConfig.token_endpoint;
}

/**
 * Clear OIDC session data from storage
 */
function clearSessionData(): void {
  sessionStorage.removeItem('oidc_state');
  sessionStorage.removeItem('oidc_code_verifier');
}

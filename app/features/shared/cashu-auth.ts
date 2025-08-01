import {
  CashuAuthMint,
  CashuAuthWallet,
  getEncodedAuthToken,
} from '@cashu/cashu-ts';
import type { Proof } from '@cashu/cashu-ts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCashuWallet } from '~/lib/cashu';
import {
  completeOidcFlow,
  refreshOidcSession,
  startOidcFlow,
} from '~/lib/oidc-client';

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

export type MintAuthRequest = {
  mintUrl: string;
  icon?: string;
  message?: string;
};

type CashuAuthStore = {
  /** Map of mint URLs to their auth sessions */
  authSessions: Record<string, ClearAuthSession>;
  /** Map of mint URLs to their blind auth tokens */
  blindAuthTokens: Record<string, Proof[]>;
  /** Current pending auth request */
  pendingAuthRequest: MintAuthRequest | null;

  // Auth session management
  setAuthSession: (mintUrl: string, session: ClearAuthSession) => void;
  getAuthSession: (mintUrl: string) => ClearAuthSession | null;
  removeAuthSession: (mintUrl: string) => void;

  // Blind auth token management
  addBlindAuthTokens: (mintUrl: string, tokens: Proof[]) => void;
  popBlindAuthToken: (mintUrl: string) => Proof | null;

  // Pending auth request management
  setPendingAuthRequest: (request: MintAuthRequest | null) => void;

  // Main auth methods
  getClearAuthTokenWithRefresh: (mintUrl: string) => Promise<string | null>;
  checkAuthRequired: (mintUrl: string) => Promise<{
    requiresClearAuth: boolean;
    requiresBlindAuth: boolean;
    clearAuthConfig: {
      openIdDiscoveryUrl: string;
      clientId: string;
    } | null;
  }>;
  checkAuthRequiredForPaths: (
    mintUrl: string,
    paths: string[],
  ) => Promise<{
    requiresClearAuth: boolean;
    requiresBlindAuth: boolean;
  }>;
  startAuth: (mintUrl: string, redirectUri: string) => Promise<void>;
  completeAuth: () => Promise<void>;
  getAndConsumeBlindAuthToken: (mintUrl: string) => Promise<string>;
  topUpBlindAuthTokens: (mintUrl: string) => Promise<void>;
};

/**
 * Zustand store for managing Cashu mint authentication tokens
 * Persists auth sessions to localStorage with individual entries per mint
 */
export const useCashuAuthStore = create<CashuAuthStore>()(
  persist(
    (set, get) => ({
      authSessions: {},
      blindAuthTokens: {},
      pendingAuthRequest: null,

      setAuthSession: (mintUrl: string, session: ClearAuthSession) => {
        set((state) => ({
          authSessions: {
            ...state.authSessions,
            [mintUrl]: session,
          },
        }));
      },

      getAuthSession: (mintUrl: string) => {
        const sessions = get().authSessions;
        return sessions[mintUrl] || null;
      },

      removeAuthSession: (mintUrl: string) => {
        set((state) => {
          const { [mintUrl]: _, ...remainingSessions } = state.authSessions;
          return {
            authSessions: remainingSessions,
          };
        });
      },

      addBlindAuthTokens: (mintUrl: string, tokens: Proof[]) => {
        set((state) => ({
          blindAuthTokens: {
            ...state.blindAuthTokens,
            [mintUrl]: [...(state.blindAuthTokens[mintUrl] || []), ...tokens],
          },
        }));
      },

      popBlindAuthToken: (mintUrl: string) => {
        const tokens = get().blindAuthTokens[mintUrl];
        if (!tokens || tokens.length === 0) {
          return null;
        }

        const poppedToken = tokens[tokens.length - 1];
        set((state) => ({
          blindAuthTokens: {
            ...state.blindAuthTokens,
            [mintUrl]: tokens.slice(0, -1),
          },
        }));

        return poppedToken;
      },

      setPendingAuthRequest: (request: MintAuthRequest | null) => {
        if (request === null) {
          set({ pendingAuthRequest: null });
          return;
        }

        getCashuWallet(request.mintUrl)
          .mint.getInfo()
          .then((info) => {
            const icon = info.icon_url;
            set({ pendingAuthRequest: { ...request, icon } });
          })
          .catch((error) => {
            console.error('Failed to get mint info', error);
            set({ pendingAuthRequest: request });
          });
      },

      getClearAuthTokenWithRefresh: async (
        mintUrl: string,
      ): Promise<string | null> => {
        const {
          getAuthSession,
          setAuthSession,
          removeAuthSession,
          setPendingAuthRequest,
        } = get();
        const session = getAuthSession(mintUrl);

        // If we have a valid session that's not expired, return the token
        if (session && !isTokenExpired(session)) {
          return session.accessToken;
        }

        // If we have an expired session, try to refresh
        if (session?.refreshToken) {
          console.debug('Token is expired, refreshing', mintUrl);

          try {
            const refreshedSession = await refreshOidcSession({
              authority: session.authority,
              clientId: session.clientId,
              refreshToken: session.refreshToken,
            });
            setAuthSession(mintUrl, {
              ...session,
              ...refreshedSession,
            });
            return refreshedSession.accessToken;
          } catch (error) {
            console.error('Failed to refresh token for', mintUrl, error);
            removeAuthSession(mintUrl);
            // Fall through to prompt user authentication
          }
        }

        // No valid session or refresh failed - check if mint requires auth and prompt user
        try {
          const wallet = getCashuWallet(mintUrl);
          const mintInfo = await wallet.getMintInfo();
          const clearAuth = mintInfo.isSupported(21);

          if (clearAuth.supported) {
            // Set pending auth request to trigger user authentication dialog
            setPendingAuthRequest({
              mintUrl,
              message:
                'This was set when calling getClearAuthTokenWithRefresh, can we hide it?',
            });
            return null;
          }
        } catch (error) {
          console.warn(
            `Failed to check mint authentication requirements for ${mintUrl}:`,
            error,
          );
        }

        return null;
      },

      checkAuthRequired: async (mintUrl: string) => {
        // TODO: this method is confusing because it checks if the mint requires auth,
        // and it checks if we are already authenticated. Will return true if we need
        // to authenticate, but if we are already authenticated, it will return false.

        const wallet = getCashuWallet(mintUrl);
        const mintInfo = await wallet.getMintInfo();

        const blindAuth = mintInfo.isSupported(22);
        const numBlindAuthTokens = get().blindAuthTokens[mintUrl]?.length || 0;
        const requiresBlindAuth =
          blindAuth.supported && numBlindAuthTokens < 10;

        const clearAuth = mintInfo.isSupported(21);

        if (clearAuth.supported) {
          const token = await get().getClearAuthTokenWithRefresh(mintUrl);
          console.debug('token', token, mintUrl);
          const hasValidToken = token !== null;

          if (!hasValidToken) {
            return {
              requiresClearAuth: true,
              requiresBlindAuth: !!requiresBlindAuth,
              clearAuthConfig: {
                openIdDiscoveryUrl: clearAuth.openid_discovery,
                clientId: clearAuth.client_id,
              },
            };
          }
        }

        return {
          requiresClearAuth: false,
          requiresBlindAuth: !!requiresBlindAuth,
          clearAuthConfig: null,
        };
      },

      checkAuthRequiredForPaths: async (mintUrl: string, paths: string[]) => {
        const authCheck = await get().checkAuthRequired(mintUrl);
        console.debug('authCheckForPaths', authCheck, paths);
        if (!authCheck.requiresClearAuth && !authCheck.requiresBlindAuth) {
          return { requiresClearAuth: false, requiresBlindAuth: false };
        }

        const wallet = getCashuWallet(mintUrl);
        const mintInfo = await wallet.getMintInfo();
        return paths.reduce(
          (acc, path) => {
            console.debug(
              'path',
              path,
              mintInfo.requiresClearAuthToken(path),
              mintInfo.requiresBlindAuthToken(path),
            );
            acc.requiresClearAuth =
              acc.requiresClearAuth || mintInfo.requiresClearAuthToken(path);
            acc.requiresBlindAuth =
              acc.requiresBlindAuth || mintInfo.requiresBlindAuthToken(path);
            return acc;
          },
          { requiresClearAuth: false, requiresBlindAuth: false } as {
            requiresClearAuth: boolean;
            requiresBlindAuth: boolean;
          },
        );
      },

      startAuth: async (mintUrl: string, redirectUri: string) => {
        const authCheck = await get().checkAuthRequired(mintUrl);

        if (!authCheck.requiresClearAuth) {
          if (authCheck.requiresBlindAuth) {
            await get().topUpBlindAuthTokens(mintUrl);
          } else {
            throw new Error('Authentication not required for this mint');
          }
        }

        sessionStorage.setItem('oidc_mint_url', mintUrl);

        if (!authCheck.clearAuthConfig) {
          throw new Error('No clear auth config found for this mint');
        }

        const authUrl = await startOidcFlow({
          openIdDiscoveryUrl: authCheck.clearAuthConfig.openIdDiscoveryUrl,
          clientId: authCheck.clearAuthConfig.clientId,
          redirectUri,
        });

        window.location.href = authUrl.toString();
      },

      completeAuth: async () => {
        const authSession = await completeOidcFlow(window.location.href);
        const mintUrl = sessionStorage.getItem('oidc_mint_url');
        if (!mintUrl) {
          throw new Error('Mint URL not found in session storage');
        }

        const { setAuthSession, setPendingAuthRequest, topUpBlindAuthTokens } =
          get();
        setAuthSession(mintUrl, {
          mintUrl,
          ...authSession,
        });
        // Clear any pending auth request for this mint
        setPendingAuthRequest(null);
        await topUpBlindAuthTokens(mintUrl);
      },

      getAndConsumeBlindAuthToken: async (mintUrl: string) => {
        const { popBlindAuthToken, topUpBlindAuthTokens } = get();
        let token = popBlindAuthToken(mintUrl);

        if (!token) {
          await topUpBlindAuthTokens(mintUrl);
          token = popBlindAuthToken(mintUrl);

          if (!token) {
            throw new Error('Failed to mint blind auth tokens');
          }
        }

        if (get().blindAuthTokens[mintUrl].length < 10) {
          topUpBlindAuthTokens(mintUrl).catch((error) => {
            console.error('Error topping up blind auth tokens', error);
          });
        }

        return getEncodedAuthToken(token);
      },

      topUpBlindAuthTokens: async (mintUrl: string) => {
        const {
          getClearAuthTokenWithRefresh,
          getAuthSession,
          addBlindAuthTokens,
        } = get();

        // Refresh the auth session
        await getClearAuthTokenWithRefresh(mintUrl);

        const clearAuthSession = getAuthSession(mintUrl);

        if (!clearAuthSession) {
          throw new Error(
            'No auth session found, need to start clear auth flow',
          );
        }

        const authWallet = new CashuAuthWallet(new CashuAuthMint(mintUrl));
        // TODO: read bat_max_mint from mint info to determine how many tokens to mint
        const NUM_TOKENS_TO_MINT = 30;
        const tokens = await authWallet.mintProofs(
          NUM_TOKENS_TO_MINT,
          clearAuthSession.accessToken,
        );
        console.debug('minted tokens', tokens);
        addBlindAuthTokens(mintUrl, tokens);
      },
    }),
    {
      name: 'cashu-auth-storage',
      // Store both sessions and blind auth tokens
      partialize: (state) => ({
        authSessions: state.authSessions,
        blindAuthTokens: state.blindAuthTokens,
      }),
    },
  ),
);

/**
 * Check if a token is expired
 */
export function isTokenExpired(session: ClearAuthSession): boolean {
  if (!session.expiresAt) {
    return false; // If no expiration time, assume token is still valid
  }

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const bufferTime = 5; // 5 seconds buffer

  return session.expiresAt <= now + bufferTime;
}

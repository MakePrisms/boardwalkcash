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
  RefreshTokenInvalidError,
  completeClearAuthFlow,
  isTokenExpired,
  refreshClearAuthToken,
  startClearAuthFlow,
} from '~/lib/cashu/mint-authentication';
import type { ClearAuthSession } from '~/lib/cashu/mint-authentication';

export type MintAuthRequest = {
  mintUrl: string;
};

type CashuAuthStore = {
  /** Map of mint URLs to their auth sessions */
  authSessions: Record<string, ClearAuthSession>;
  /** Map of mint URLs to their blind auth tokens */
  blindAuthTokens: Record<string, Proof[]>;
  /** Current pending auth request */
  pendingAuthRequest: MintAuthRequest | null;
  /** Set auth session for a specific mint */
  setAuthSession: (mintUrl: string, session: ClearAuthSession) => void;
  /** Get auth session for a specific mint */
  getAuthSession: (mintUrl: string) => ClearAuthSession | null;
  /** Clear auth session for a specific mint */
  clearAuthSession: (mintUrl: string) => void;
  /** Push multiple blind auth tokens for a specific mint */
  addBlindAuthTokens: (mintUrl: string, tokens: Proof[]) => void;
  /** Pop a blind auth token for a specific mint */
  popBlindAuthToken: (mintUrl: string) => Proof | null;
  /** Get all blind auth tokens for a specific mint */
  getBlindAuthTokens: (mintUrl: string) => Proof[];
  /** Set pending auth request */
  setPendingAuthRequest: (request: MintAuthRequest | null) => void;
  /** Get clear auth token with automatic refresh and user auth prompting */
  getClearAuthTokenWithRefresh: (mintUrl: string) => Promise<string | null>;
  /** Initialize the store (for startup) */
  initialize: () => void;
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

      clearAuthSession: (mintUrl: string) => {
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

      getBlindAuthTokens: (mintUrl: string) => {
        const tokens = get().blindAuthTokens;
        return tokens[mintUrl] || [];
      },

      setPendingAuthRequest: (request: MintAuthRequest | null) => {
        set({ pendingAuthRequest: request });
      },

      getClearAuthTokenWithRefresh: async (
        mintUrl: string,
      ): Promise<string | null> => {
        const {
          getAuthSession,
          setAuthSession,
          clearAuthSession,
          setPendingAuthRequest,
        } = get();
        const session = getAuthSession(mintUrl);

        // If we have a valid session that's not expired, return the token
        if (session && !isTokenExpired(session)) {
          return session.accessToken;
        }

        // If we have an expired session, try to refresh
        if (session) {
          console.debug('Token is expired, refreshing', mintUrl);
          try {
            const refreshedSession = await refreshClearAuthToken(session);
            setAuthSession(mintUrl, refreshedSession);
            return refreshedSession.accessToken;
          } catch (error) {
            if (error instanceof RefreshTokenInvalidError) {
              console.warn(
                'Refresh token is invalid, clearing auth session for',
                mintUrl,
              );
              clearAuthSession(mintUrl);
              // Fall through to prompt user authentication
            } else {
              // For other errors, log and return null
              console.error('Failed to refresh token for', mintUrl, error);
              return null;
            }
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

      initialize: () => {
        // Store is already initialized by zustand persist
        // This method exists for explicit initialization if needed
        console.debug('Cashu auth store initialized');
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
 * Simple auth service for managing Cashu mint authentication
 * This provides a non-React interface that can be used by getCashuWallet
 */
export class CashuAuthService {
  private static instance: CashuAuthService | null = null;

  static getInstance(): CashuAuthService {
    if (!CashuAuthService.instance) {
      CashuAuthService.instance = new CashuAuthService();
    }
    return CashuAuthService.instance;
  }

  /**
   * Get auth token for a mint URL with automatic refresh and user authentication prompting
   * @param mintUrl - The mint URL to get token for
   * @returns The auth token if available and valid, null if user authentication is required
   */
  async getClearAuthToken(mintUrl: string): Promise<string | null> {
    const store = useCashuAuthStore.getState();
    return await store.getClearAuthTokenWithRefresh(mintUrl);
  }

  /**
   * Check if a mint requires authentication
   * @param mintUrl - The mint URL to check
   * @returns Promise resolving to auth requirement info
   */
  async checkAuthRequired(mintUrl: string): Promise<{
    requiresClearAuth: boolean;
    requiresBlindAuth: boolean;
    clearAuthConfig: {
      openIdDiscoveryUrl: string;
      clientId: string;
    } | null;
  }> {
    const wallet = getCashuWallet(mintUrl);
    const mintInfo = await wallet.getMintInfo();

    const blindAuth = mintInfo.isSupported(22);
    const numBlindAuthTokens = useCashuAuthStore
      .getState()
      .getBlindAuthTokens(mintUrl).length;
    const requiresBlindAuth = blindAuth.supported && numBlindAuthTokens < 10;

    const clearAuth = mintInfo.isSupported(21);

    if (clearAuth.supported) {
      const token = await this.getClearAuthToken(mintUrl);
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
  }

  async checkAuthRequiredForPaths(mintUrl: string, paths: string[]) {
    const authCheck = await this.checkAuthRequired(mintUrl);
    if (!authCheck.requiresClearAuth && !authCheck.clearAuthConfig) {
      return { requiresClearAuth: false, requiresBlindAuth: false };
    }

    const wallet = getCashuWallet(mintUrl);
    const mintInfo = await wallet.getMintInfo();
    return paths.reduce(
      (acc, path) => {
        acc.requiresClearAuth =
          acc.requiresClearAuth || mintInfo.requiresClearAuthToken(path);
        acc.requiresBlindAuth =
          acc.requiresBlindAuth || mintInfo.requiresBlindAuthToken(path);
        return acc;
      },
      { requiresClearAuth: false, requiresBlindAuth: false },
    );
  }

  /**
   * Start authentication flow for a mint
   * @param mintUrl - The mint URL to authenticate with
   * @param redirectUri - The redirect URI for OIDC callback
   * @throws Error if authentication is not required for this mint
   */
  async startAuth(mintUrl: string, redirectUri: string): Promise<void> {
    const authCheck = await this.checkAuthRequired(mintUrl);

    if (!authCheck.requiresClearAuth || !authCheck.clearAuthConfig) {
      throw new Error('Authentication not required for this mint');
    }

    await startClearAuthFlow({
      mintUrl,
      openIdDiscoveryUrl: authCheck.clearAuthConfig.openIdDiscoveryUrl,
      clientId: authCheck.clearAuthConfig.clientId,
      redirectUri,
    });
  }

  /**
   * Complete authentication flow and store the session
   * @returns Promise resolving to the auth session
   */
  async completeAuth(): Promise<void> {
    const authSession = await completeClearAuthFlow();
    const store = useCashuAuthStore.getState();
    store.setAuthSession(authSession.mintUrl, authSession);
    // Clear any pending auth request for this mint
    store.setPendingAuthRequest(null);
    await this.topUpBlindAuthTokens(authSession.mintUrl);
  }

  async getAndConsumeBlindAuthToken(mintUrl: string): Promise<string> {
    const store = useCashuAuthStore.getState();
    const token = store.popBlindAuthToken(mintUrl);
    if (!token) throw new Error('Need to mint more blind auth tokens');

    if (store.blindAuthTokens[mintUrl].length < 10) {
      this.topUpBlindAuthTokens(mintUrl).catch((error) => {
        console.error('Error topping up blind auth tokens', error);
      });
    }

    return getEncodedAuthToken(token);
  }

  async topUpBlindAuthTokens(mintUrl: string): Promise<void> {
    const clearAuthSession = useCashuAuthStore
      .getState()
      .getAuthSession(mintUrl);
    if (!clearAuthSession)
      throw new Error('No auth session found, need to start clear auth flow');

    const authWallet = new CashuAuthWallet(new CashuAuthMint(mintUrl));
    // TODO: read bat_max_mint from mint info to determine how many tokens to mint
    const NUM_TOKENS_TO_MINT = 30;
    const tokens = await authWallet.mintProofs(
      NUM_TOKENS_TO_MINT,
      clearAuthSession.accessToken,
    );
    console.debug('minted tokens', tokens);
    const store = useCashuAuthStore.getState();
    store.addBlindAuthTokens(mintUrl, tokens);
  }
}

export const cashuAuthService = CashuAuthService.getInstance();

import {
  CashuAuthMint,
  CashuAuthWallet,
  type Proof,
  getEncodedAuthToken,
} from '@cashu/cashu-ts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  completeOidcFlow,
  prepareOidcFlow,
  refreshOidcSession,
} from '~/lib/oidc-client';
import { getQueryClient } from '~/query-client';
import { mintInfoQuery } from './cashu';

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

type CashuAuthStoreState = {
  /**
   * A map of mint URLs to their associated authentication sessions.
   * The key is the mint URL, and the value is the authentication session.
   */
  sessions: Record<string, ClearAuthSession>;
  blindAuthTokens: Record<string, Proof[]>;
};

type CashuAuthStoreActions = {
  startOidcFlow: (mintUrl: string) => Promise<void>;
  completeOidcFlow: (callbackUrl: string) => Promise<void>;
  getClearAuthTokenWithRefresh: (
    mintUrl: string,
  ) => Promise<string | undefined>;
  getAndConsumeBlindAuthToken: (mintUrl: string) => Promise<string>;
  topUpBlindAuthTokens: (mintUrl: string) => Promise<void>;
};

export type CashuAuthStore = CashuAuthStoreState & CashuAuthStoreActions;

export const cashuAuthStore = create<CashuAuthStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      blindAuthTokens: {},
      startOidcFlow: async (mintUrl) => {
        // TODO: casn we inject the query client here?
        const mintInfo = await getQueryClient().fetchQuery(
          mintInfoQuery(mintUrl),
        );

        const nut21 = mintInfo.isSupported(21);
        if (!nut21.supported) {
          throw new Error(
            'Mint does not support clear authentication via NUT-21',
          );
        }

        const alreadyHasSession = mintUrl in get().sessions;
        if (alreadyHasSession) {
          throw new Error('Session already exists for this mint');
        }

        const authUrl = await prepareOidcFlow({
          openIdDiscoveryUrl: nut21.openid_discovery,
          clientId: nut21.client_id,
          redirectUri: `${window.location.origin}/oidc-callback`,
          customStateData: {
            mintUrl,
          },
        });

        // Redirect to the authorization URL
        // TODO: should we instead just return the authUrl and handle redirect in the component?
        window.location.href = authUrl.toString();
      },
      completeOidcFlow: async (callbackUrl) => {
        const session = await completeOidcFlow(callbackUrl);

        const mintUrl = session.customStateData?.mintUrl;
        if (!mintUrl || typeof mintUrl !== 'string') {
          throw new Error('Mint URL not found in callback URL');
        }

        // Store the session with the mint URL
        set((state) => ({
          sessions: {
            ...state.sessions,
            [mintUrl]: {
              accessToken: session.accessToken,
              refreshToken: session.refreshToken,
              expiresAt: session.expiresAt,
              authority: session.authority,
              clientId: session.clientId,
              mintUrl,
            },
          },
        }));
      },
      getClearAuthTokenWithRefresh: async (mintUrl) => {
        const session = get().sessions[mintUrl];
        if (!session) {
          //  TODO: we should ask the user before starting the oidc flow
          await get().startOidcFlow(mintUrl);
          return undefined;
        }

        if (!isSessionExpired(session)) {
          return session.accessToken;
        }

        if (!session.refreshToken) {
          throw new Error(
            `Clear auth session for mint ${mintUrl} is expired and no refresh token is available`,
          );
        }

        try {
          // TODO: what if this fails? It could fail if the user's auth session has been revoked completely.
          const refreshedSession = await refreshOidcSession({
            authority: session.authority,
            clientId: session.clientId,
            refreshToken: session.refreshToken,
          });

          set((state) => ({
            sessions: {
              ...state.sessions,
              [mintUrl]: {
                refreshToken: refreshedSession.refreshToken,
                accessToken: refreshedSession.accessToken,
                expiresAt: refreshedSession.expiresAt,
                authority: session.authority,
                clientId: session.clientId,
                mintUrl,
              },
            },
          }));

          return refreshedSession.accessToken;
        } catch (error) {
          console.error('Error refreshing clear auth token', error);
          //clear session
          set((state) => {
            delete state.sessions[mintUrl];
            return state;
          });
          throw error;
        }
      },
      topUpBlindAuthTokens: async (mintUrl) => {
        const clearAuthToken =
          await get().getClearAuthTokenWithRefresh(mintUrl);
        if (!clearAuthToken) {
          throw new Error(`No clear auth token available for mint ${mintUrl}`);
        }

        const authWallet = new CashuAuthWallet(new CashuAuthMint(mintUrl));

        // TODO: read bat_max_mint from mint info
        const NUM_TOKENS_TO_MINT = 30;
        const blindAuthTokens = await authWallet.mintProofs(
          NUM_TOKENS_TO_MINT,
          clearAuthToken,
        );

        set((state) => ({
          blindAuthTokens: {
            ...state.blindAuthTokens,
            [mintUrl]: blindAuthTokens,
          },
        }));
      },
      getAndConsumeBlindAuthToken: async (mintUrl) => {
        let blindAuthTokens = get().blindAuthTokens[mintUrl] || [];
        if (blindAuthTokens.length === 0) {
          await get().topUpBlindAuthTokens(mintUrl);
          // Get fresh state after topping up
          blindAuthTokens = get().blindAuthTokens[mintUrl] || [];
        }

        if (blindAuthTokens.length === 0) {
          throw new Error(`No blind auth tokens available for mint ${mintUrl}`);
        }

        // Get the token before removing it
        const token = blindAuthTokens[0];

        // Remove the consumed token from the store
        set((state) => ({
          blindAuthTokens: {
            ...state.blindAuthTokens,
            [mintUrl]: blindAuthTokens.slice(1),
          },
        }));

        return getEncodedAuthToken(token);
      },
    }),
    {
      name: 'cashu-auth-store',
      partialize: (state) => ({
        sessions: state.sessions,
        blindAuthTokens: state.blindAuthTokens,
      }),
    },
  ),
);

const isSessionExpired = (session: ClearAuthSession) => {
  if (!session.expiresAt) {
    return false;
  }
  const now = Date.now() / 1000; // current time in seconds
  const bufferTime = 5; // 5 seconds buffer time
  return session.expiresAt < now + bufferTime;
};

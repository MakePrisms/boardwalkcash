import { useOpenSecret } from '@opensecret/react';
import {
  type PropsWithChildren,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useLocation } from 'react-router';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import useLocationData from '~/hooks/use-location';
import { useToast } from '~/hooks/use-toast';
import { useTrackAccounts } from '../accounts/account-hooks';
import { agicashDb } from '../agicash-db/database';
import { supabaseSessionStore } from '../agicash-db/supabse-session-store';
import { LoadingScreen } from '../loading/LoadingScreen';
import { useTrackPendingCashuReceiveQuotes } from '../receive/cashu-receive-quote-hooks';
import { useTrackPendingCashuTokenSwaps } from '../receive/cashu-token-swap-hooks';
import { useTrackUnresolvedCashuSendQuotes } from '../send/cashu-send-quote-hooks';
import { useTrackUnresolvedCashuSendSwaps } from '../send/cashu-send-swap-hooks';
import { cashuAuthService, useCashuAuthStore } from '../shared/cashu-auth';
import { useTheme } from '../theme';
import { type AuthUser, useHandleSessionExpiry } from '../user/auth';
import { useUpsertUser, useUser } from '../user/user-hooks';
import { TaskProcessor, useTakeTaskProcessingLead } from './task-processing';

type SupabaseInitializationState =
  | {
      status: 'initializing' | 'initialized';
    }
  | {
      status: 'error';
      error: Error;
    };

const useInitializeSupabaseSessionStore = () => {
  const { generateThirdPartyToken } = useOpenSecret();
  const [state, setState] = useState<SupabaseInitializationState>({
    status: 'initialized',
  });

  useEffect(() => {
    supabaseSessionStore
      .getState()
      .setJwtGetter(() => generateThirdPartyToken().then((res) => res.token));

    // Needed for this workaround https://github.com/supabase/realtime/issues/282#issuecomment-2630983759
    agicashDb.realtime
      .setAuth()
      .then(() => {
        setState({
          status: 'initialized',
        });
      })
      .catch((error) => {
        setState({
          status: 'error',
          error: new Error('Failed to initialize Supabase session store', {
            cause: error,
          }),
        });
      });
  }, [generateThirdPartyToken]);

  if (state.status === 'error') {
    throw state.error;
  }

  const isInitialized = state.status === 'initialized';
  return isInitialized;
};

/**
 * Syncs the theme settings stored in cookies to match the default currency
 * according to the Agicash database.
 */
const useSyncThemeWithDefaultCurrency = () => {
  const { setTheme } = useTheme();
  const defaultCurrency = useUser((user) => user.defaultCurrency);
  useEffect(() => {
    const theme = defaultCurrency === 'BTC' ? 'btc' : 'usd';
    setTheme(theme);
  }, [defaultCurrency, setTheme]);
};

const useRefreshMintAuthentication = () => {
  const { origin } = useLocationData();
  const location = useLocation();
  const pendingAuthRequest = useCashuAuthStore(
    (state) => state.pendingAuthRequest,
  );
  const setPendingAuthRequest = useCashuAuthStore(
    (state) => state.setPendingAuthRequest,
  );

  // this gets called when the user clicks the authenticate button in the dialog
  const handleConfirmAuth = useCallback(
    async (mintUrl: string) => {
      try {
        const redirectUri = `${origin}/oidc-callback`;
        sessionStorage.setItem(
          'oidc_return_to',
          location.pathname + location.search + location.hash,
        );

        await cashuAuthService.startAuth(mintUrl, redirectUri);
      } catch (error) {
        console.warn(
          `Failed to start authentication for mint ${mintUrl}:`,
          error,
        );
      } finally {
        setPendingAuthRequest(null);
      }
    },
    [origin, setPendingAuthRequest, location],
  );

  const handleCancelAuth = useCallback(() => {
    setPendingAuthRequest(null);
  }, [setPendingAuthRequest]);

  return {
    pendingAuthRequest,
    handleConfirmAuth,
    handleCancelAuth,
  };
};

/**
 * Makes sure that the user is created in the Agicash DB for every new Open Secret user.
 * If the user already exists, it will be updated to sync the shared data.
 * @param authUser - The user data from Open Secret.
 * @returns Created or updated user data from the Agicash DB.
 */
const useUpsertAgicashUser = (authUser: AuthUser) => {
  const { data: user, mutate } = useUpsertUser();

  useEffect(() => {
    if (authUser) {
      mutate(authUser);
    }
  }, [authUser, mutate]);

  return user ?? null;
};

const Wallet = ({ children }: PropsWithChildren) => {
  const { toast } = useToast();
  const isGuestAccount = useUser((user) => user.isGuest);

  useHandleSessionExpiry({
    isGuestAccount,
    onLogout: () => {
      toast({
        title: 'Session expired',
        description:
          'The session has expired. You will be redirected to the login page.',
      });
    },
  });

  useSyncThemeWithDefaultCurrency();

  const isLead = useTakeTaskProcessingLead();

  const { pendingAuthRequest, handleConfirmAuth, handleCancelAuth } =
    useRefreshMintAuthentication();

  const accountsSubscription = useTrackAccounts();
  const pendingCashuReceiveQuotesSubscription =
    useTrackPendingCashuReceiveQuotes();
  const pendingCashuTokenSwapsSubscription = useTrackPendingCashuTokenSwaps();
  const unresolvedCashuSendQuotesSubscription =
    useTrackUnresolvedCashuSendQuotes();
  const unresolvedCashuSendSwapsSubscription =
    useTrackUnresolvedCashuSendSwaps();

  if (
    accountsSubscription === 'subscribing' ||
    pendingCashuReceiveQuotesSubscription === 'subscribing' ||
    pendingCashuTokenSwapsSubscription === 'subscribing' ||
    unresolvedCashuSendQuotesSubscription === 'subscribing' ||
    unresolvedCashuSendSwapsSubscription === 'subscribing'
  ) {
    return <LoadingScreen />;
  }

  return (
    <>
      {isLead && <TaskProcessor />}
      {children}

      <Dialog
        open={!!pendingAuthRequest}
        onOpenChange={(open) => !open && handleCancelAuth()}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Mint Authentication Required</DialogTitle>
            <DialogDescription>
              The mint {pendingAuthRequest?.mintUrl} requires authentication to
              be used. Would you like to authenticate now? If you skip this, you
              won't be able to use this mint until you authenticate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2">
            <Button variant="outline" onClick={handleCancelAuth}>
              Skip for now
            </Button>
            <Button
              onClick={() =>
                pendingAuthRequest &&
                handleConfirmAuth(pendingAuthRequest.mintUrl)
              }
            >
              Authenticate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Creates the required wallet data for the user, if not already present.
 * @param authUser - The user data from Open Secret.
 * @returns True if the setup is done, false otherwise.
 */
const useSetupWallet = (authUser: AuthUser) => {
  const isInitialized = useInitializeSupabaseSessionStore();

  const user = useUpsertAgicashUser(authUser);
  const setupCompleted = isInitialized && user !== null;

  return setupCompleted;
};

type Props = PropsWithChildren<{
  authUser: AuthUser;
}>;

export const WalletSetup = ({ authUser, children }: Props) => {
  const setupCompleted = useSetupWallet(authUser);

  if (!setupCompleted) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Wallet>{children}</Wallet>
    </Suspense>
  );
};

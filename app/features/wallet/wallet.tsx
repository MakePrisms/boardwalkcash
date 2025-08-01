import { useOpenSecret } from '@opensecret/react';
import {
  type PropsWithChildren,
  Suspense,
  useCallback,
  useEffect,
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
import { supabaseSessionStore } from '../agicash-db/supabase-session-store';
import { LoadingScreen } from '../loading/LoadingScreen';
import { useTrackPendingCashuReceiveQuotes } from '../receive/cashu-receive-quote-hooks';
import { useTrackPendingCashuTokenSwaps } from '../receive/cashu-token-swap-hooks';
import { useTrackUnresolvedCashuSendQuotes } from '../send/cashu-send-quote-hooks';
import { useTrackUnresolvedCashuSendSwaps } from '../send/cashu-send-swap-hooks';
import { useCashuAuthStore } from '../shared/cashu-auth';
import { useEncryptionKey } from '../shared/encryption';
import { useTheme } from '../theme';
import { type AuthUser, useHandleSessionExpiry } from '../user/auth';
import { useUpsertUser, useUser } from '../user/user-hooks';
import { TaskProcessor, useTakeTaskProcessingLead } from './task-processing';

const useInitializeSupabaseSessionStore = () => {
  const { generateThirdPartyToken } = useOpenSecret();

  useEffect(() => {
    supabaseSessionStore
      .getState()
      .setJwtGetter(() => generateThirdPartyToken().then((res) => res.token));
  }, [generateThirdPartyToken]);
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

// TODO: this is a bit repeated in receive-cashu-token-hooks.tsx and receive-cashu.tsx
const useRefreshMintAuthentication = () => {
  const { origin } = useLocationData();
  const location = useLocation();
  const pendingAuthRequest = useCashuAuthStore(
    (state) => state.pendingAuthRequest,
  );
  const setPendingAuthRequest = useCashuAuthStore(
    (state) => state.setPendingAuthRequest,
  );
  const startAuth = useCashuAuthStore((state) => state.startAuth);

  // this gets called when the user clicks the authenticate button in the dialog
  const handleConfirmAuth = useCallback(
    async (mintUrl: string) => {
      try {
        const redirectUri = `${origin}/oidc-callback`;
        sessionStorage.setItem(
          'oidc_return_to',
          location.pathname + location.search + location.hash,
        );

        await startAuth(mintUrl, redirectUri);
      } catch (error) {
        console.warn(
          `Failed to start authentication for mint ${mintUrl}:`,
          error,
        );
      } finally {
        setPendingAuthRequest(null);
      }
    },
    [origin, setPendingAuthRequest, location, startAuth],
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
      {/* TODO: move this Dialog elsewhere */}
      <Dialog
        open={!!pendingAuthRequest}
        onOpenChange={(open) => !open && handleCancelAuth()}
      >
        <DialogContent className="px-4 sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-4">
              {pendingAuthRequest?.icon && (
                <img
                  src={pendingAuthRequest.icon}
                  alt="Mint icon"
                  className="h-16 w-16 rounded-lg"
                />
              )}
              <div className="flex h-full flex-col items-start justify-between">
                <DialogTitle className="text-left">
                  Mint Authentication Required
                </DialogTitle>
                <DialogDescription className="text-left">
                  {pendingAuthRequest?.message ||
                    `Authentication is required to continue using ${pendingAuthRequest?.mintUrl}.`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="my-6 flex w-full flex-col gap-3">
            <div className="text-muted-foreground text-sm">
              • You'll be redirected to the mint's authentication page
            </div>
            <div className="text-muted-foreground text-sm">
              • You can skip for now, but you'll be prompted whenever you try to
              perform this action again
            </div>
          </div>

          <DialogFooter className="flex w-full flex-row items-center justify-center gap-2">
            <Button
              className="w-32"
              variant="outline"
              onClick={handleCancelAuth}
            >
              Skip for now
            </Button>
            <Button
              className="w-32"
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
  useInitializeSupabaseSessionStore();

  const user = useUpsertAgicashUser(authUser);
  const setupCompleted = user !== null;

  // Makes sure that the encryption key is pulled from the server
  useEncryptionKey();

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

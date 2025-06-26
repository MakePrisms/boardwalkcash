import { useOpenSecret } from '@opensecret/react';
import { type PropsWithChildren, Suspense, useEffect, useState } from 'react';
import { useToast } from '~/hooks/use-toast';
import { useTrackAccounts } from '../accounts/account-hooks';
import { agicashDb } from '../agicash-db/database';
import { supabaseSessionStore } from '../agicash-db/supabse-session-store';
import { LoadingScreen } from '../loading/LoadingScreen';
import { useTrackPendingCashuReceiveQuotes } from '../receive/cashu-receive-quote-hooks';
import { useTrackPendingCashuTokenSwaps } from '../receive/cashu-token-swap-hooks';
import { useTrackUnresolvedCashuSendQuotes } from '../send/cashu-send-quote-hooks';
import { useTrackUnresolvedCashuSendSwaps } from '../send/cashu-send-swap-hooks';
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

  useTrackAccounts();
  useTrackPendingCashuReceiveQuotes();
  useTrackPendingCashuTokenSwaps();
  useTrackUnresolvedCashuSendQuotes();
  useTrackUnresolvedCashuSendSwaps();

  const isLead = useTakeTaskProcessingLead();

  return (
    <>
      {isLead && <TaskProcessor />}
      {children}
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

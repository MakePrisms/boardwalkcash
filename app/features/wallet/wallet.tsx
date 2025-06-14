import { useOpenSecret } from '@opensecret/react';
import { useQuery } from '@tanstack/react-query';
import { type PropsWithChildren, Suspense, useEffect, useState } from 'react';
import { useToast } from '~/hooks/use-toast';
import { useTrackAccounts } from '../accounts/account-hooks';
import { supabaseSessionStore } from '../agicash-db/supabse-session-store';
import { LoadingScreen } from '../loading/LoadingScreen';
import {
  useProcessCashuReceiveQuoteTasks,
  useTrackPendingCashuReceiveQuotes,
} from '../receive/cashu-receive-quote-hooks';
import {
  useProcessCashuTokenSwapTasks,
  useTrackPendingCashuTokenSwaps,
} from '../receive/cashu-token-swap-hooks';
import {
  useProcessCashuSendQuoteTasks,
  useTrackUnresolvedCashuSendQuotes,
} from '../send/cashu-send-quote-hooks';
import {
  useProcessCashuSendSwapTasks,
  useTrackUnresolvedCashuSendSwaps,
} from '../send/cashu-send-swap-hooks';
import { useTheme } from '../theme';
import { type AuthUser, useHandleSessionExpiry } from '../user/auth';
import { useUpsertUser, useUser } from '../user/user-hooks';
import { useTaskProcessingLockRepository } from './task-processing-lock-repository';

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

const TaskProcessor = () => {
  useProcessCashuReceiveQuoteTasks();
  useProcessCashuTokenSwapTasks();
  useProcessCashuSendQuoteTasks();
  useProcessCashuSendSwapTasks();
  return null;
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

  const isLead = useTakeLead();

  return (
    <>
      {isLead && <TaskProcessor />}
      {children}
    </>
  );
};

const useTakeLead = () => {
  const taskProcessingLockRepository = useTaskProcessingLockRepository();
  const userId = useUser((user) => user.id);
  const [clientId] = useState(() => crypto.randomUUID());

  const { data: takeLeadResult, error } = useQuery({
    queryKey: ['take-lead', userId, clientId],
    queryFn: () => {
      return taskProcessingLockRepository.takeLead(userId, clientId);
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (error) {
      console.warn(
        'Error. Take lead request failed. Will retry in 5 seconds.',
        {
          cause: error,
        },
      );
    }
  }, [error]);

  return takeLeadResult ?? false;
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

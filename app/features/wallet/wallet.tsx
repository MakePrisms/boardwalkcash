import { useOpenSecret } from '@opensecret/react';
import * as Sentry from '@sentry/react-router';
import { type PropsWithChildren, Suspense, useEffect } from 'react';
import { useToast } from '~/hooks/use-toast';
import { useTrackAccounts } from '../accounts/account-hooks';
import { supabaseSessionStore } from '../agicash-db/supabase-session-store';
import { LoadingScreen } from '../loading/LoadingScreen';
import { useTrackHasNotifications } from '../notifications/notification-hooks';
import { useTrackPendingCashuReceiveQuotes } from '../receive/cashu-receive-quote-hooks';
import { useTrackPendingCashuTokenSwaps } from '../receive/cashu-token-swap-hooks';
import { useTrackUnresolvedCashuSendQuotes } from '../send/cashu-send-quote-hooks';
import { useTrackUnresolvedCashuSendSwaps } from '../send/cashu-send-swap-hooks';
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
  const user = useUser();

  useEffect(() => {
    Sentry.setUser({
      id: user.id,
      username: user.username,
      isGuest: user.isGuest,
      defaultCurrency: user.defaultCurrency,
    });

    return () => {
      Sentry.setUser(null);
    };
  }, [user]);

  useHandleSessionExpiry({
    isGuestAccount: user.isGuest,
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

  const accountsSubscription = useTrackAccounts();
  const hasNotificationsSubscription = useTrackHasNotifications();
  const pendingCashuReceiveQuotesSubscription =
    useTrackPendingCashuReceiveQuotes();
  const pendingCashuTokenSwapsSubscription = useTrackPendingCashuTokenSwaps();
  const unresolvedCashuSendQuotesSubscription =
    useTrackUnresolvedCashuSendQuotes();
  const unresolvedCashuSendSwapsSubscription =
    useTrackUnresolvedCashuSendSwaps();

  if (
    accountsSubscription === 'subscribing' ||
    hasNotificationsSubscription === 'subscribing' ||
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

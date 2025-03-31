import { type PropsWithChildren, Suspense, useEffect } from 'react';
import { useToast } from '~/hooks/use-toast';
import { useTrackAccounts } from '../accounts/account-hooks';
import { supabaseSessionStore } from '../boardwalk-db/supabse-session-store';
import { LoadingScreen } from '../loading/LoadingScreen';
import { useTrackPendingCashuReceiveQuotes } from '../receive/cashu-receive-quote-hooks';
import { useRecoverPendingCashuTokenSwaps } from '../receive/cashu-token-swap-hooks';
import { type AuthUser, useHandleSessionExpiry } from '../user/auth';
import { useUpsertUser, useUser } from '../user/user-hooks';

const useSetSupabseSession = (authUser: AuthUser) => {
  useEffect(() => {
    supabaseSessionStore.getState().setJwtPayload({ sub: authUser.id });
  }, [authUser]);
};

/**
 * Makes sure that the user is created in the Boardwalk DB for every new Open Secret user.
 * If the user already exists, it will be updated to sync the shared data.
 * @param authUser - The user data from Open Secret.
 * @returns Created or updated user data from the Boardwalk DB.
 */
const useUpsertBoardwalkUser = (authUser: AuthUser) => {
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

  useTrackAccounts();
  useTrackPendingCashuReceiveQuotes();
  useRecoverPendingCashuTokenSwaps();

  return children;
};

/**
 * Creates the required wallet data for the user, if not already present.
 * @param authUser - The user data from Open Secret.
 * @returns True if the setup is done, false otherwise.
 */
const useSetupWallet = (authUser: AuthUser) => {
  useSetSupabseSession(authUser);

  const user = useUpsertBoardwalkUser(authUser);
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

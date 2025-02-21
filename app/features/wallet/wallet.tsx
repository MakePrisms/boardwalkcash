import { useMutation } from '@tanstack/react-query';
import { type PropsWithChildren, Suspense, useEffect } from 'react';
import { useToast } from '~/hooks/use-toast';
import { type BoardwalkDbUser, boardwalkDb } from '../boardwalk-db/database';
import { supabaseSessionStore } from '../boardwalk-db/supabse-session-store';
import { LoadingScreen } from '../loading/LoadingScreen';
import { type AuthUser, useHandleSessionExpiry } from '../user/auth';
import type { User } from '../user/user';
import { useUser } from '../user/user-hooks';
import { UserRepository } from '../user/user-repository';

const useSetSupabseSession = (authUser: AuthUser) => {
  useEffect(() => {
    supabaseSessionStore.getState().setJwtPayload({ sub: authUser.id });
  }, [authUser]);
};

const userRepository = new UserRepository(boardwalkDb);

const defaultAccounts = [
  {
    type: 'cashu',
    currency: 'USD',
    name: 'Default USD Account',
    mintUrl: 'https://mint.lnvoltz.com/',
  },
  {
    type: 'cashu',
    currency: 'BTC',
    name: 'Default BTC Account',
    mintUrl: 'https://mint.lnvoltz.com/',
  },
] as const;

const toUser = (boardwalkUserData: BoardwalkDbUser): User => {
  if (boardwalkUserData.email) {
    return {
      id: boardwalkUserData.id,
      email: boardwalkUserData.email,
      emailVerified: boardwalkUserData.email_verified,
      createdAt: boardwalkUserData.created_at,
      updatedAt: boardwalkUserData.updated_at,
      defaultBtcAccountId: boardwalkUserData.default_btc_account_id ?? '',
      defaultUsdAccountId: boardwalkUserData.default_usd_account_id ?? '',
      defaultCurrency: boardwalkUserData.default_currency,
      isGuest: false,
    };
  }

  return {
    id: boardwalkUserData.id,
    emailVerified: boardwalkUserData.email_verified,
    createdAt: boardwalkUserData.created_at,
    updatedAt: boardwalkUserData.updated_at,
    defaultBtcAccountId: boardwalkUserData.default_btc_account_id ?? '',
    defaultUsdAccountId: boardwalkUserData.default_usd_account_id ?? '',
    defaultCurrency: boardwalkUserData.default_currency,
    isGuest: true,
  };
};

/**
 * Makes sure that the user is created in the Boardwalk DB for every new Open Secret user.
 * If the user already exists, it will be updated to sync the shared data.
 * @param authUser - The user data from Open Secret.
 * @returns Created or updated user data from the Boardwalk DB.
 */
const useUpsertBoardwalkUser = (authUser: AuthUser) => {
  // const queryClient = useQueryClient();

  const { mutate, data } = useMutation({
    mutationKey: ['user-upsert'],
    mutationFn: (user: AuthUser) =>
      userRepository.upsert({ ...user, accounts: [...defaultAccounts] }),
    scope: {
      id: 'user-upsert',
    },
    // onSuccess: (data) => {
    //   queryClient.setQueryData(['users', data.id], toUser(data));
    // },
    throwOnError: true,
  });

  useEffect(() => {
    if (authUser) {
      mutate(authUser);
    }
  }, [authUser, mutate]);

  return data ?? null;
};

const SessionManager = ({
  children,
  user,
}: PropsWithChildren<{ user: User }>) => {
  const { toast } = useToast();
  const isGuestAccount = useUser((user) => user.isGuest, user);

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

  return children;
};

/**
 * Creates the required wallet data for the user. If the data is already present, it will be updated if any changes are detected.
 * @param authUser - The user data from Open Secret.
 * @returns True if the wallet data is created or updated, false otherwise.
 */
const useSetupWallet = (
  authUser: AuthUser,
):
  | { setupCompleted: false; user: null }
  | { setupCompleted: true; user: User } => {
  useSetSupabseSession(authUser);

  const user = useUpsertBoardwalkUser(authUser);
  const setupCompleted = user !== null;

  if (!setupCompleted) {
    return { setupCompleted, user: null };
  }

  return { setupCompleted, user: toUser(user) };
};

type Props = PropsWithChildren<{
  authUser: AuthUser;
}>;

export const WalletSetup = ({ authUser, children }: Props) => {
  const { setupCompleted, user } = useSetupWallet(authUser);

  if (!setupCompleted) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <SessionManager user={user}>{children}</SessionManager>
    </Suspense>
  );
};

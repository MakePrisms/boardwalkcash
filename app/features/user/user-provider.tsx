import { useOpenSecret } from '@opensecret/react';
import { useMutation } from '@tanstack/react-query';
import {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useStore } from 'zustand';
import { type AuthUser, useHandleSessionExpiry } from '~/features/user/auth';
import { useToast } from '~/hooks/use-toast';
import type { Account } from '../accounts/account';
import { type BoardwalkDbUser, boardwalkDb } from '../boardwalk-db/database';
import { supabaseSessionStore } from '../boardwalk-db/supabse-session-store';
import { LoadingScreen } from '../loading/LoadingScreen';
import type { User } from './user';
import { UserRepository } from './user-repository';
import { type UserState, type UserStore, createUserStore } from './user-store';

const UserContext = createContext<UserStore | null>(null);

type Props = PropsWithChildren<{
  authUser: AuthUser;
}>;

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

/**
 * Makes sure that the user is created in the Boardwalk DB for every new Open Secret user.
 * If the user already exists, it will be updated to sync the shared data.
 * @param openSecretUserData - The user data from Open Secret.
 * @returns Created or updated user data from the Boardwalk DB.
 */
const useUpsertBoardwalkUser = (openSecretUserData: AuthUser) => {
  const { mutate, data } = useMutation({
    mutationKey: ['user-upsert'],
    mutationFn: (user: AuthUser) =>
      userRepository.upsert({ ...user, accounts: [...defaultAccounts] }),
    scope: {
      id: 'user-upsert',
    },
    throwOnError: true,
  });

  useEffect(() => {
    if (openSecretUserData) {
      mutate(openSecretUserData);
    }
  }, [openSecretUserData, mutate]);

  return data ?? null;
};

const mergeUserData = (
  authUserData: AuthUser,
  boardwalkUserData: BoardwalkDbUser & { accounts: Account[] },
): User => {
  if (authUserData.email) {
    return {
      id: authUserData.id,
      email: authUserData.email,
      emailVerified: authUserData.email_verified,
      loginMethod: authUserData.login_method,
      createdAt: boardwalkUserData.created_at,
      updatedAt: boardwalkUserData.updated_at,
      defaultBtcAccountId: boardwalkUserData.default_btc_account_id ?? '',
      defaultUsdAccountId: boardwalkUserData.default_usd_account_id ?? '',
      defaultCurrency: boardwalkUserData.default_currency,
      accounts: boardwalkUserData.accounts,
      isGuest: false,
    };
  }

  return {
    id: authUserData.id,
    emailVerified: authUserData.email_verified,
    loginMethod: authUserData.login_method,
    createdAt: boardwalkUserData.created_at,
    updatedAt: boardwalkUserData.updated_at,
    defaultBtcAccountId: boardwalkUserData.default_btc_account_id ?? '',
    defaultUsdAccountId: boardwalkUserData.default_usd_account_id ?? '',
    defaultCurrency: boardwalkUserData.default_currency,
    accounts: boardwalkUserData.accounts,
    isGuest: true,
  };
};

const useSetSupabseSession = (authUser: AuthUser) => {
  useEffect(() => {
    supabaseSessionStore.getState().setJwtPayload({ sub: authUser.id });
  }, [authUser]);
};

const FullUserProvider = ({
  user,
  children,
}: { user: User; children: ReactNode }) => {
  const { toast } = useToast();
  const openSecret = useOpenSecret();

  const storeRef = useRef<UserStore>();
  if (!storeRef.current) {
    storeRef.current = createUserStore({
      user,
      convertGuestToUserAccount: openSecret.convertGuestToUserAccount,
      requestNewVerificationCode: openSecret.requestNewVerificationCode,
      verifyEmail: openSecret.verifyEmail,
      refetchUser: openSecret.refetchUser,
    });
  }

  useEffect(() => {
    const state = storeRef.current?.getState();
    if (state && state.user !== user) {
      state.setUser(user);
    }
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

  return (
    <UserContext.Provider value={storeRef.current}>
      {children}
    </UserContext.Provider>
  );
};

export const UserProvider = ({ authUser, children }: Props) => {
  useSetSupabseSession(authUser);

  const boardwalkUser = useUpsertBoardwalkUser(authUser);

  const user = useMemo(() => {
    return boardwalkUser ? mergeUserData(authUser, boardwalkUser) : null;
  }, [authUser, boardwalkUser]);

  if (!user) {
    return <LoadingScreen />;
  }

  return <FullUserProvider user={user}>{children}</FullUserProvider>;
};

export const useUserStore = <T,>(selector: (state: UserState) => T): T => {
  const store = useContext(UserContext);
  if (!store) {
    throw new Error('Missing UserProvider in the tree');
  }
  return useStore(store, selector);
};

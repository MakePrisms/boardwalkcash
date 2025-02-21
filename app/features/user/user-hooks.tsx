import { useOpenSecret } from '@opensecret/react';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import type { DistributedOmit } from 'type-fest';
import { useIsomorphicLayoutEffect } from 'usehooks-ts';
import { type AuthUser, useAuthState } from '~/features/user/auth';
import type { Currency } from '~/lib/money';
import type { Account } from '../accounts/account';
import { type BoardwalkDbUser, boardwalkDb } from '../boardwalk-db/database';
import { guestAccountStorage } from './guest-account-storage';
import type { User } from './user';
import { UserRepository } from './user-repository';

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

const userRepository = new UserRepository(boardwalkDb);

const queryKey = 'users';

/**
 * This hook returns the logged in user data.
 * @param select - This option can be used to transform or select a part of the data returned by the query function. If not provided, the user data will be returned as is.
 * @returns The selected user data.
 */
export const useUser = <TData = User>(
  select?: (data: User) => TData,
  initialData?: User,
): TData => {
  const authState = useAuthState();
  const authUser = authState.user;
  if (!authUser) {
    throw new Error('Cannot use useUser hook in anonymous context');
  }

  const response = useSuspenseQuery({
    queryKey: [queryKey, authUser.id],
    queryFn: () => userRepository.get(authUser.id).then((data) => toUser(data)),
    select,
    initialData,
  });

  return response.data;
};

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

export function useUserActions() {
  const openSecret = useOpenSecret();

  // We are doing this to keep references for these actions constant. Open secret implementation currently creates a new
  // reference for each render. See https://github.com/OpenSecretCloud/OpenSecret-SDK/blob/master/src/lib/main.tsx#L350
  const convertGuestToUserAccountRef = useRef(openSecret.signUpGuest);
  const requestNewVerificationCodeRef = useRef(
    openSecret.requestNewVerificationCode,
  );
  const verifyEmailRef = useRef(openSecret.verifyEmail);
  const refetchUserRef = useRef(openSecret.refetchUser);

  const queryClient = useQueryClient();
  const user = useUser();
  const userRef = useRef(user);

  useIsomorphicLayoutEffect(() => {
    userRef.current = user;
  }, [user]);

  const upsertUserMutation = useMutation({
    mutationKey: ['user-upsert'],
    mutationFn: (user: AuthUser) =>
      userRepository
        .upsert({ ...user, accounts: [...defaultAccounts] })
        .then(({ accounts, ...user }) => {
          return {
            user: toUser(user),
            accounts,
          };
        }),
    scope: {
      id: 'user-upsert',
    },
    onSuccess: (data) => {
      queryClient.setQueryData([queryKey, data.user.id], data.user);
    },
    throwOnError: true,
  });

  const updateUserMutation = useMutation({
    mutationFn: (updates: Partial<BoardwalkDbUser>) =>
      userRepository.update({ id: userRef.current.id, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKey, userRef.current.id],
      });
    },
  });

  const addAccountMutation = useMutation({
    mutationFn: (account: DistributedOmit<Account, 'id' | 'createdAt'>) =>
      userRepository.addAccount(userRef.current.id, account),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKey, userRef.current.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['accounts', userRef.current.id],
      });
    },
  });

  const upgradeGuestToFullAccount = useCallback(
    async (email: string, password: string) => {
      if (!userRef.current.isGuest) {
        throw new Error('User already has a full account');
      }
      await convertGuestToUserAccountRef.current(email, password);
      guestAccountStorage.clear();
    },
    [],
  );

  const requestNewEmailVerificationCode = useCallback(async () => {
    if (userRef.current.isGuest) {
      throw new Error('Cannot request email verification for guest account');
    }
    if (userRef.current.emailVerified) {
      throw new Error('Email is already verified');
    }
    await requestNewVerificationCodeRef.current();
  }, []);

  const verifyEmail = useCallback(async (code: string) => {
    if (userRef.current.isGuest) {
      throw new Error('Cannot verify email for guest account');
    }
    if (userRef.current.emailVerified) {
      throw new Error('Email is already verified');
    }
    await verifyEmailRef.current(code);
    await refetchUserRef.current();
  }, []);

  const setDefaultCurrency = useCallback(
    (currency: Currency) =>
      updateUserMutation.mutateAsync({ default_currency: currency }),
    [updateUserMutation],
  );

  const setDefaultAccount = useCallback(
    async (account: Account) => {
      if (account.currency === 'BTC') {
        return updateUserMutation.mutateAsync({
          default_btc_account_id: account.id,
        });
      }
      if (account.currency === 'USD') {
        return updateUserMutation.mutateAsync({
          default_usd_account_id: account.id,
        });
      }
      throw new Error('Unsupported currency');
    },
    [updateUserMutation],
  );

  const addAccount = useCallback(
    (account: DistributedOmit<Account, 'id' | 'createdAt'>) =>
      addAccountMutation.mutateAsync(account),
    [addAccountMutation],
  );

  return {
    upgradeGuestToFullAccount,
    requestNewEmailVerificationCode,
    verifyEmail,
    setDefaultCurrency,
    setDefaultAccount,
    addAccount,
    upsertUser: upsertUserMutation.mutate,
  };
}

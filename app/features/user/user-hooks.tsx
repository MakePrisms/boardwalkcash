import { useOpenSecret } from '@opensecret/react';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useIsomorphicLayoutEffect } from 'usehooks-ts';
import { type AuthUser, useAuthState } from '~/features/user/auth';
import type { Currency } from '~/lib/money';
import type { Account } from '../accounts/account';
import { accountsQueryKey } from '../accounts/account-hooks';
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

const usersQueryKey = 'users';

/**
 * This hook returns the logged in user data.
 * @param select - This option can be used to transform or select a part of the data returned by the query function. If not provided, the user data will be returned as is.
 * @returns The selected user data.
 */
export const useUser = <TData = User>(
  select?: (data: User) => TData,
): TData => {
  const authState = useAuthState();
  const authUser = authState.user;
  if (!authUser) {
    throw new Error('Cannot use useUser hook in anonymous context');
  }

  const response = useSuspenseQuery({
    queryKey: [usersQueryKey, authUser.id],
    queryFn: () => userRepository.get(authUser.id).then((data) => toUser(data)),
    select,
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

export const useUpsertUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
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
      queryClient.setQueryData<User>([usersQueryKey, data.user.id], data.user);
      queryClient.setQueryData<Account[]>(
        [accountsQueryKey, data.user.id],
        data.accounts,
      );
    },
    throwOnError: true,
  });
};

const useUserRef = () => {
  const user = useUser();
  const userRef = useRef(user);

  useIsomorphicLayoutEffect(() => {
    userRef.current = user;
  }, [user]);

  return userRef;
};

export const useUpgradeGuestToFullAccount = () => {
  const openSecret = useOpenSecret();

  const convertGuestToUserAccountRef = useRef(openSecret.signUpGuest);
  const userRef = useUserRef();

  return useCallback(async (email: string, password: string) => {
    if (!userRef.current.isGuest) {
      throw new Error('User already has a full account');
    }
    await convertGuestToUserAccountRef.current(email, password);
    guestAccountStorage.clear();
  }, []);
};

export const useRrequestNewEmailVerificationCode = () => {
  const openSecret = useOpenSecret();

  const requestNewVerificationCodeRef = useRef(
    openSecret.requestNewVerificationCode,
  );
  const userRef = useUserRef();

  return useCallback(async () => {
    if (userRef.current.isGuest) {
      throw new Error('Cannot request email verification for guest account');
    }
    if (userRef.current.emailVerified) {
      throw new Error('Email is already verified');
    }
    await requestNewVerificationCodeRef.current();
  }, []);
};

export const useVerifyEmail = () => {
  const openSecret = useOpenSecret();

  const verifyEmailRef = useRef(openSecret.verifyEmail);
  const refetchUserRef = useRef(openSecret.refetchUser);
  const userRef = useUserRef();

  return useCallback(async (code: string) => {
    if (userRef.current.isGuest) {
      throw new Error('Cannot verify email for guest account');
    }
    if (userRef.current.emailVerified) {
      throw new Error('Email is already verified');
    }
    await verifyEmailRef.current(code);
    await refetchUserRef.current();
  }, []);
};

const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const userRef = useUserRef();

  return useMutation({
    mutationFn: (updates: Partial<BoardwalkDbUser>) =>
      userRepository.update({ id: userRef.current.id, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [usersQueryKey, userRef.current.id],
      });
    },
  });
};

export const useSetDefaultCurrency = () => {
  const { mutateAsync: updateUser } = useUpdateUser();

  return useCallback(
    (currency: Currency) => updateUser({ default_currency: currency }),
    [updateUser],
  );
};

export const useSetDefaultAccount = () => {
  const { mutateAsync: updateUser } = useUpdateUser();

  return useCallback(
    async (account: Account) => {
      if (account.currency === 'BTC') {
        return updateUser({
          default_btc_account_id: account.id,
        });
      }
      if (account.currency === 'USD') {
        return updateUser({
          default_usd_account_id: account.id,
        });
      }
      throw new Error('Unsupported currency');
    },
    [updateUser],
  );
};

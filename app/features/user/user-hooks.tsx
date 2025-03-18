import { useOpenSecret } from '@opensecret/react';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useIsomorphicLayoutEffect } from 'usehooks-ts';
import { type AuthUser, useAuthState } from '~/features/user/auth';
import type { Currency } from '~/lib/money';
import type { Account } from '../accounts/account';
import { accountsQueryKey } from '../accounts/account-hooks';
import { boardwalkDb } from '../boardwalk-db/database';
import { guestAccountStorage } from './guest-account-storage';
import type { User } from './user';
import { type UpdateUser, UserRepository } from './user-repository';

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
    queryFn: () => userRepository.get(authUser.id),
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
    isTestMint: false,
  },
  {
    type: 'spark',
    currency: 'BTC',
    name: 'Spark',
  },
] as const;

export const useUpsertUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['user-upsert'],
    mutationFn: (user: AuthUser) =>
      userRepository.upsert({
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified,
        accounts: [...defaultAccounts],
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

export const useUpgradeGuestToFullAccount = (): ((
  email: string,
  password: string,
) => Promise<void>) => {
  const userRef = useUserRef();
  const { signUpGuest } = useOpenSecret();

  const { mutateAsync } = useMutation({
    mutationKey: ['upgrade-guest-to-full-account'],
    mutationFn: (variables: { email: string; password: string }) => {
      if (!userRef.current.isGuest) {
        throw new Error('User already has a full account');
      }

      return signUpGuest(variables.email, variables.password).then(() => {
        guestAccountStorage.clear();
      });
    },
    scope: {
      id: 'upgrade-guest-to-full-account',
    },
  });

  return useCallback(
    (email: string, password: string) => mutateAsync({ email, password }),
    [mutateAsync],
  );
};

export const useRequestNewEmailVerificationCode = (): (() => Promise<void>) => {
  const userRef = useUserRef();
  const { requestNewVerificationCode } = useOpenSecret();

  const { mutateAsync } = useMutation({
    mutationKey: ['request-new-email-verification-code'],
    mutationFn: () => {
      if (userRef.current.isGuest) {
        throw new Error('Cannot request email verification for guest account');
      }
      if (userRef.current.emailVerified) {
        throw new Error('Email is already verified');
      }

      return requestNewVerificationCode();
    },
    scope: {
      id: 'request-new-email-verification-code',
    },
  });

  return mutateAsync;
};

export const useVerifyEmail = (): ((code: string) => Promise<void>) => {
  const userRef = useUserRef();
  const { verifyEmail, refetchUser } = useOpenSecret();

  const { mutateAsync } = useMutation({
    mutationKey: ['verify-email'],
    mutationFn: (code: string) => {
      if (userRef.current.isGuest) {
        throw new Error('Cannot verify email for guest account');
      }
      if (userRef.current.emailVerified) {
        throw new Error('Email is already verified');
      }

      return verifyEmail(code).then(refetchUser);
    },
    scope: {
      id: 'verify-email',
    },
  });

  return mutateAsync;
};

const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const userRef = useUserRef();

  return useMutation({
    mutationFn: (updates: UpdateUser) =>
      userRepository.update(userRef.current.id, updates),
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
    (currency: Currency) => updateUser({ defaultCurrency: currency }),
    [updateUser],
  );
};

export const useSetDefaultAccount = () => {
  const { mutateAsync: updateUser } = useUpdateUser();

  return useCallback(
    async (account: Account) => {
      if (account.currency === 'BTC') {
        return updateUser({
          defaultBtcAccountId: account.id,
        });
      }
      if (account.currency === 'USD') {
        return updateUser({
          defaultUsdAccountId: account.id,
        });
      }
      throw new Error('Unsupported currency');
    },
    [updateUser],
  );
};

import type { OpenSecretContextType } from '@opensecret/react';
import type { DistributedOmit } from 'type-fest';
import { create } from 'zustand';
import { guestAccountStorage } from '~/features/user/guest-account-storage';
import type { User } from '~/features/user/user';
import type { Currency } from '~/lib/money';
import type { Account } from '../accounts/account';
import { boardwalkDb } from '../boardwalk-db/database';
import { UserRepository } from './user-repository';

type Props = {
  user: User;
  convertGuestToUserAccount: OpenSecretContextType['convertGuestToUserAccount'];
  requestNewVerificationCode: OpenSecretContextType['requestNewVerificationCode'];
  verifyEmail: OpenSecretContextType['verifyEmail'];
  refetchUser: OpenSecretContextType['refetchUser'];
};

export interface UserState {
  user: User;
  setUser: (user: User) => void;
  upgradeGuestToFullAccount: Props['convertGuestToUserAccount'];
  requestNewEmailVerificationCode: Props['requestNewVerificationCode'];
  verifyEmail: Props['verifyEmail'];
  setDefaultCurrency: (currency: Currency) => Promise<void>;
  setDefaultAccount: (account: Account) => Promise<void>;
  addAccount: (
    account: DistributedOmit<Account, 'id' | 'createdAt'>,
  ) => Promise<Account>;
}

const userRepository = new UserRepository(boardwalkDb);

export const createUserStore = ({
  user,
  convertGuestToUserAccount,
  requestNewVerificationCode,
  verifyEmail,
  refetchUser,
}: Props) => {
  return create<UserState>((set, get) => ({
    user,
    setUser: (user) => {
      return set({ user });
    },
    upgradeGuestToFullAccount: async (email: string, password: string) => {
      const user = get().user;
      if (!user.isGuest) {
        throw new Error('User already has a full account');
      }
      await convertGuestToUserAccount(email, password);
      guestAccountStorage.clear();
    },
    requestNewEmailVerificationCode: async () => {
      const user = get().user;
      if (user.isGuest) {
        throw new Error('Cannot request email verification for guest account');
      }
      if (user.emailVerified) {
        throw new Error('Email is already verified');
      }
      await requestNewVerificationCode();
    },
    verifyEmail: async (code: string) => {
      const user = get().user;
      if (user.isGuest) {
        throw new Error('Cannot verify email for guest account');
      }
      if (user.emailVerified) {
        throw new Error('Email is already verified');
      }
      await verifyEmail(code);
      await refetchUser();
    },
    setDefaultCurrency: async (currency: Currency) => {
      const user = get().user;
      const updatedUser = await userRepository.update({
        id: user.id,
        default_currency: currency,
      });
      set({
        user: {
          ...user,
          defaultCurrency: currency,
          updatedAt: updatedUser.updated_at,
        },
      });
    },
    setDefaultAccount: async (account: Account) => {
      const user = get().user;

      let updatedUser: Awaited<ReturnType<typeof userRepository.update>>;

      if (account.currency === 'BTC') {
        updatedUser = await userRepository.update({
          id: user.id,
          default_btc_account_id: account.id,
        });
      } else if (account.currency === 'USD') {
        updatedUser = await userRepository.update({
          id: user.id,
          default_usd_account_id: account.id,
        });
      } else {
        throw new Error('Unsupported currency');
      }

      set({
        user: {
          ...user,
          defaultBtcAccountId:
            updatedUser.default_btc_account_id ?? user.defaultBtcAccountId,
          defaultUsdAccountId:
            updatedUser.default_usd_account_id ?? user.defaultUsdAccountId,
          updatedAt: updatedUser.updated_at,
        },
      });
    },
    addAccount: async (
      account: DistributedOmit<Account, 'id' | 'createdAt'>,
    ) => {
      const user = get().user;
      const addedAccount = await userRepository.addAccount(user.id, account);
      set({
        user: {
          ...user,
          accounts: [...user.accounts, addedAccount],
        },
      });
      return addedAccount;
    },
  }));
};

export type UserStore = ReturnType<typeof createUserStore>;

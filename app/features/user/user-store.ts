import type { OpenSecretContextType } from '@opensecret/react';
import { create } from 'zustand';
import { guestAccountStorage } from '~/features/user/guest-account-storage';
import type { User } from '~/features/user/user';

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
}

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
  }));
};

export type UserStore = ReturnType<typeof createUserStore>;

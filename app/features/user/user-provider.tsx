import { useOpenSecret } from '@opensecret/react';
import {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { useStore } from 'zustand';
import type { User } from '~/features/user/user';
import {
  type UserState,
  type UserStore,
  createUserStore,
} from '~/features/user/user-store';

const UserContext = createContext<UserStore | null>(null);

type Props = PropsWithChildren<{
  user: User;
}>;

export const UserProvider = ({ user, children }: Props) => {
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

  return (
    <UserContext.Provider value={storeRef.current}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserStore = <T,>(selector: (state: UserState) => T): T => {
  const store = useContext(UserContext);
  if (!store) {
    throw new Error('Missing UserProvider in the tree');
  }
  return useStore(store, selector);
};

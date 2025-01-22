import {
  type PropsWithChildren,
  createContext,
  useContext,
  useRef,
} from 'react';
import { useStore } from 'zustand';
import type { Account } from '../accounts/account-selector';
import type { ReceiveState, ReceiveStore } from './receive-store';
import { createReceiveStore } from './receive-store';

const ReceiveContext = createContext<ReceiveStore | null>(null);

type Props = PropsWithChildren<{
  /** Usually the user's default account. This sets the initial account to receive to. */
  initialAccount: Account;
}>;

export const ReceiveProvider = ({ children, initialAccount }: Props) => {
  const storeRef = useRef<ReceiveStore>();
  if (!storeRef.current) {
    storeRef.current = createReceiveStore({
      initialAccount,
      initialAmount: null,
    });
  }

  return (
    <ReceiveContext.Provider value={storeRef.current}>
      {children}
    </ReceiveContext.Provider>
  );
};

export const useReceiveStore = <T,>(
  selector: (state: ReceiveState) => T,
): T => {
  const store = useContext(ReceiveContext);
  if (!store) {
    throw new Error('Missing ReceiveProvider in the tree');
  }
  return useStore(store, selector);
};

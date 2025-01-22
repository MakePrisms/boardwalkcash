import {
  type PropsWithChildren,
  createContext,
  useContext,
  useRef,
} from 'react';
import { useStore } from 'zustand';
import type { Account } from '../accounts/account-selector';
import type { SendState, SendStore } from './send-store';
import { createSendStore } from './send-store';

const SendContext = createContext<SendStore | null>(null);

type Props = PropsWithChildren<{
  /** Usually the user's default account. This sets the initial account to send from. */
  initialAccount: Account;
}>;

export const SendProvider = ({ children, initialAccount }: Props) => {
  const storeRef = useRef<SendStore>();
  if (!storeRef.current) {
    storeRef.current = createSendStore({
      initialAccount,
      initialAmount: null,
    });
  }

  return (
    <SendContext.Provider value={storeRef.current}>
      {children}
    </SendContext.Provider>
  );
};

export const useSendStore = <T,>(selector: (state: SendState) => T): T => {
  const store = useContext(SendContext);
  if (!store) {
    throw new Error('Missing SendProvider in the tree');
  }
  return useStore(store, selector);
};

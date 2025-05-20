import {
  type PropsWithChildren,
  createContext,
  useContext,
  useState,
} from 'react';
import { useStore } from 'zustand';
import type { Account } from '~/features/accounts/account';
import { useCreateCashuSendQuote } from './cashu-send-quote-hooks';
import { type SendState, type SendStore, createSendStore } from './send-store';
import { useGetInvoiceFromLud16 } from './use-get-invoice-from-lud16';

const SendContext = createContext<SendStore | null>(null);

type Props = PropsWithChildren<{
  /** Usually the user's default account. This sets the initial account to send from. */
  initialAccount: Account;
}>;

export const SendProvider = ({ children, initialAccount }: Props) => {
  const { mutateAsync: getInvoiceFromLud16 } = useGetInvoiceFromLud16();
  const { mutateAsync: createCashuSendQuote } = useCreateCashuSendQuote();

  const [store] = useState(() =>
    createSendStore({
      initialAccount,
      getInvoiceFromLud16,
      createCashuSendQuote,
    }),
  );

  return <SendContext.Provider value={store}>{children}</SendContext.Provider>;
};

export const useSendStore = <T,>(selector: (state: SendState) => T): T => {
  const store = useContext(SendContext);
  if (!store) {
    throw new Error('Missing SendProvider in the tree');
  }
  return useStore(store, selector);
};

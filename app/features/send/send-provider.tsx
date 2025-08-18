import {
  type PropsWithChildren,
  createContext,
  useContext,
  useState,
} from 'react';
import { useStore } from 'zustand';
import type { ExtendedAccount } from '~/features/accounts/account';
import {
  useAccountsCache,
  useGetLatestAccount,
} from '../accounts/account-hooks';
import { useCreateCashuSendQuote } from './cashu-send-quote-hooks';
import { useGetCashuSendSwapQuote } from './cashu-send-swap-hooks';
import { type SendState, type SendStore, createSendStore } from './send-store';
import { useGetInvoiceFromLud16 } from './use-get-invoice-from-lud16';

const SendContext = createContext<SendStore | null>(null);

type Props = PropsWithChildren<{
  /** Usually the user's default account. This sets the initial account to send from. */
  initialAccount: ExtendedAccount;
}>;

export const SendProvider = ({ initialAccount, children }: Props) => {
  const { mutateAsync: getInvoiceFromLud16 } = useGetInvoiceFromLud16();
  const { mutateAsync: createCashuSendQuote } = useCreateCashuSendQuote();
  const { mutateAsync: getCashuSendSwapQuote } = useGetCashuSendSwapQuote();
  const accountsCache = useAccountsCache();
  const getLatestAccount = useGetLatestAccount();

  const [store] = useState(() =>
    createSendStore({
      initialAccount,
      accountsCache,
      getLatestAccount,
      getInvoiceFromLud16,
      createCashuSendQuote,
      getCashuSendSwapQuote,
    }),
  );

  return <SendContext.Provider value={store}>{children}</SendContext.Provider>;
};

export const useSendStore = <T = SendState>(
  selector?: (state: SendState) => T,
): T => {
  const store = useContext(SendContext);
  if (!store) {
    throw new Error('Missing SendProvider in the tree');
  }
  return useStore(store, selector ?? ((state) => state as T));
};

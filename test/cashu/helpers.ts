import type { CashuWallet, Proof } from '@cashu/cashu-ts';
import type { Schema, Storage } from 'lib/cashu/WalletManager';
import { payInvoice } from './lightningCli';

export const getNewProofsToUse = async (
  wallet: CashuWallet,
  amount: number,
): Promise<Proof[]> => {
  const mintQuote = await wallet.createMintQuote(amount);

  await payInvoice(mintQuote.request, { nodeNumber: 1 });

  return await wallet.mintProofs(amount, mintQuote.quote);
};

export const createMockStorage = <T extends Schema>(): Storage<T> => {
  const storage = new Map<keyof T, T[keyof T]>();

  const initialData = {
    config: {
      mints: [
        {
          url: 'http://localhost:8081',
          nickname: 'test mint',
        },
      ],
      activeMintUrl: 'http://localhost:8081',
      activeUnit: 'sat',
    },
    keysetCounters: [],
    transactionHistory: {
      historyTokens: [],
      invoiceHistory: [],
    },
    version: 'v2.0.0',
  };

  for (const [key, value] of Object.entries(initialData)) {
    storage.set(key as keyof T, value as T[keyof T]);
  }

  return {
    get: async (key) => storage.get(key),
    put: async (key, value) => {
      storage.set(key, value);
    },
    delete: async (key) => {
      storage.delete(key);
    },
  };
};

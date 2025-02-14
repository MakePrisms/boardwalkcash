import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { create } from 'zustand';
import type { Currency } from '~/lib/money';
import { getCurrencyFromCashuUnit } from '../shared/cashu';

type CashuWalletUnit = 'sat' | 'usd';

type WalletState = {
  wallets: Record<Currency, Record<string, CashuWallet>>;
  getWallet: (mintUrl: string, unit?: CashuWalletUnit) => Promise<CashuWallet>;
};

export const useCashuWalletStore = create<WalletState>((set, get) => ({
  wallets: { BTC: {}, USD: {} },
  getWallet: async (mintUrl: string, unit: CashuWalletUnit = 'sat') => {
    const currency = getCurrencyFromCashuUnit(unit);
    const existingWallet = get().wallets[currency][mintUrl];

    if (existingWallet) {
      return existingWallet;
    }

    const mint = new CashuMint(mintUrl);
    const wallet = new CashuWallet(mint, { unit });
    await wallet.loadMint();

    set((state) => ({
      wallets: {
        ...state.wallets,
        [currency]: { ...state.wallets[currency], [mintUrl]: wallet },
      },
    }));

    return wallet;
  },
}));

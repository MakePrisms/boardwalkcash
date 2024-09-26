import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { CashuMint, CashuWallet, MintActiveKeys, MintKeys } from '@cashu/cashu-ts';
import { Currency, Wallet as StoredKeyset } from '@/types';
import { RootState, useAppDispatch } from '@/redux/store';
import { addKeyset, setMainKeyset, updateKeysetStatus } from '@/redux/slices/Wallet.slice';
import { useSelector } from 'react-redux';

interface MintWithWallets {
   mint: CashuMint;
   wallets: Map<Currency, string>; // Currency to wallet keyset Fid
}

interface CashuContextType {
   mints: Map<string, MintWithWallets>;
   wallets: Map<string, CashuWallet>;
   activeWallet: CashuWallet | null;
   defaultWallets: Map<Currency, CashuWallet>; // Default/Active wallet for each currency
   reserveWallet: CashuWallet | null;
   getWallet: (id: string) => CashuWallet | undefined;
   getMint: (url: string) => CashuMint | undefined;
   setKeysetNotReserve: () => void;
   connectReserve: (usdKeyset: MintKeys, mintUrl: string) => void;
   setToMain: (keysetId: string) => void;
   setDefaultWallet: (currency: Currency, keysetId: string) => void;
   addWallet: (
      keysets: MintActiveKeys,
      mintUrl: string,
      opts?: { activeUnit?: string; currencies?: string[] },
   ) => void;
   addWalletFromMintUrl: (url: string, activeUnit?: 'usd' | 'sat') => Promise<void>;
   isMintTrusted: (mintUrl: string) => boolean;
   activeUnit: Currency;
   setActiveUnit: (unit: Currency) => void;
}

const CashuContext = createContext<CashuContextType | undefined>(undefined);

export const CashuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [mints, setMints] = useState<Map<string, MintWithWallets>>(new Map());
   const [wallets, setWallets] = useState<Map<string, CashuWallet>>(new Map());
   const [activeWallet, setActiveWallet] = useState<CashuWallet | null>(null);
   const [defaultWallets, setDefaultWallets] = useState<Map<Currency, CashuWallet>>(new Map());
   const [reserveWallet, setReserveWallet] = useState<CashuWallet | null>(null);
   const [activeUnit, setActiveUnit] = useState<Currency>(Currency.USD);
   const { defaultUnit } = useSelector((state: RootState) => state.user);

   const dispatch = useAppDispatch();

   useEffect(() => {
      const initMints = (keysets: StoredKeyset[]) => {
         const mintsMap = new Map<string, MintWithWallets>();
         keysets.forEach(({ url }) => {
            if (!mintsMap.has(url)) {
               mintsMap.set(url, { mint: new CashuMint(url), wallets: new Map() });
            }
         });
         setMints(mintsMap);
         return mintsMap;
      };

      const initWallets = (keysets: StoredKeyset[], mintsMap: Map<string, MintWithWallets>) => {
         const walletMap = new Map<string, CashuWallet>();
         const defaultWalletsMap = new Map<Currency, CashuWallet>();
         const storedDefaultWallets = JSON.parse(localStorage.getItem('defaultWallets') || '{}');
         keysets.forEach(k => {
            const mintWithWallets = mintsMap.get(k.url);
            if (mintWithWallets) {
               const wallet = new CashuWallet(mintWithWallets.mint, { keys: k.keys });
               walletMap.set(k.id, wallet);
               mintWithWallets.wallets.set(k.keys.unit as Currency, k.id);
               if (k.active || storedDefaultWallets[k.keys.unit] === k.id) {
                  defaultWalletsMap.set(k.keys.unit as Currency, wallet);
                  if (k.keys.unit === defaultUnit) {
                     setActiveWallet(wallet);
                  }
               }
               if (k.isReserve) {
                  setReserveWallet(wallet);
               }
            }
         });
         setWallets(walletMap);
         setDefaultWallets(defaultWalletsMap);
         localStorage.setItem(
            'defaultWallets',
            JSON.stringify(Object.fromEntries(defaultWalletsMap)),
         );
      };

      const init = () => {
         console.log('init cashu context');
         console.log('defaultUnit', defaultUnit);
         const keysets = JSON.parse(localStorage.getItem('keysets') || '[]') as StoredKeyset[];
         const newMintsMap = initMints(keysets);
         initWallets(keysets, newMintsMap);
         setActiveUnit(defaultUnit as Currency);
      };

      init();
   }, [defaultUnit]);

   useEffect(() => {
      const body = document.querySelector('body');
      if (body) {
         if (activeUnit === Currency.USD) {
            body.style.backgroundColor = '#0f3470';
         } else {
            body.style.backgroundColor = '#1D4D98';
         }
      }
      return () => {
         if (body) {
            body.style.backgroundColor = '';
         }
      };
   }, [activeUnit]);

   const setKeysetNotReserve = () => {
      if (!reserveWallet) {
         return;
      }

      setReserveWallet(null);
      dispatch(updateKeysetStatus({ id: reserveWallet.keys.id, isReserve: false }));
   };

   const connectReserve = (usdKeyset: MintKeys, mintUrl: string) => {
      let mintWithWallets = mints.get(mintUrl);
      if (!mintWithWallets) {
         mintWithWallets = { mint: new CashuMint(mintUrl), wallets: new Map() };
         setMints(new Map(mints.set(mintUrl, mintWithWallets)));
      }
      const wallet = new CashuWallet(mintWithWallets.mint, { keys: usdKeyset });

      dispatch(addKeyset({ keyset: usdKeyset, url: mintUrl, isReserve: true }));
      dispatch(setMainKeyset(usdKeyset.id));

      setWallets(new Map(wallets.set(usdKeyset.id, wallet)));
      mintWithWallets.wallets.set(usdKeyset.unit as Currency, usdKeyset.id);

      setReserveWallet(wallet);
      setActiveWallet(wallet);
      setDefaultWallets(new Map(defaultWallets.set(usdKeyset.unit as Currency, wallet)));
      setDefaultWallet(usdKeyset.unit as Currency, usdKeyset.id);
   };

   const setToMain = (keysetId: string) => {
      const wallet = wallets.get(keysetId);
      if (!wallet) {
         return;
      }
      const unit = wallet.keys.unit as Currency;
      const previousDefaultWallet = defaultWallets.get(unit);
      if (previousDefaultWallet && previousDefaultWallet.keys.id !== wallet.keys.id) {
         dispatch(updateKeysetStatus({ id: previousDefaultWallet.keys.id, active: false }));
      }
      console.log('setting wallet to main', wallet);
      setDefaultWallets(new Map(defaultWallets.set(unit, wallet)));
      setActiveWallet(wallet);
      dispatch(setMainKeyset(keysetId));
      localStorage.setItem('defaultWallets', JSON.stringify(Object.fromEntries(defaultWallets)));
   };

   const setDefaultWallet = (currency: Currency, keysetId: string) => {
      const wallet = wallets.get(keysetId);
      if (!wallet) {
         return;
      }
      const currentDefaultWallet = defaultWallets.get(currency);
      if (currentDefaultWallet && currentDefaultWallet.keys.id === keysetId) {
         return;
      }
      if (currentDefaultWallet) {
         dispatch(updateKeysetStatus({ id: currentDefaultWallet.keys.id, active: false }));
      }
      setDefaultWallets(new Map(defaultWallets.set(currency, wallet)));
      dispatch(updateKeysetStatus({ id: keysetId, active: true }));
      localStorage.setItem('defaultWallets', JSON.stringify(Object.fromEntries(defaultWallets)));
   };

   const addWalletFromMintUrl = async (url: string, activeUnit?: 'usd' | 'sat') => {
      const mint = new CashuMint(url);

      const activeKeysets = await mint.getKeys();

      return addWallet(activeKeysets, url, {
         activeUnit: activeUnit || 'usd',
         currencies: ['usd', 'sat'],
      });
   };

   const addWallet = (
      activeKeys: MintActiveKeys,
      mintUrl: string,
      opts?: { activeUnit?: string; currencies?: string[] },
   ) => {
      let mintWithWallets = mints.get(mintUrl);
      if (!mintWithWallets) {
         mintWithWallets = { mint: new CashuMint(mintUrl), wallets: new Map() };
         setMints(new Map(mints.set(mintUrl, mintWithWallets)));
      }

      const { keysets } = activeKeys;
      for (const currency of opts?.currencies || ['usd']) {
         const k = keysets.find(k => k.unit === currency);
         if (k) {
            const wallet = new CashuWallet(mintWithWallets.mint, { keys: k });
            setWallets(new Map(wallets.set(k.id, wallet)));
            mintWithWallets.wallets.set(k.unit as Currency, k.id);
            const active = opts?.activeUnit === k.unit;
            dispatch(addKeyset({ keyset: k, url: mintUrl, active }));
            if (active) {
               setDefaultWallets(new Map(defaultWallets.set(k.unit as Currency, wallet)));
               if (k.unit === activeUnit) {
                  setActiveWallet(wallet);
               }
            }
            if (!defaultWallets.has(k.unit as Currency)) {
               setDefaultWallet(k.unit as Currency, k.id);
            }
         }
      }
      localStorage.setItem('defaultWallets', JSON.stringify(Object.fromEntries(defaultWallets)));
   };

   const getWallet = (id: string) => wallets.get(id);

   const getMint = (url: string) => mints.get(url)?.mint;

   const isMintTrusted = useCallback(
      (mintUrl: string) => {
         return mints.has(mintUrl);
      },
      [mints],
   );

   const setUnit = (unit: Currency) => {
      const defaultWallet = defaultWallets.get(unit);
      console.log('setting unit to ', unit);
      if (defaultWallet) {
         console.log('default wallet found for unit', defaultWallet);
         setToMain(defaultWallet.keys.id);
      } else {
         console.error('No default wallet found for unit', unit);
         return;
      }
      setActiveUnit(unit);
   };

   return (
      <CashuContext.Provider
         value={{
            mints,
            wallets,
            activeWallet,
            defaultWallets,
            reserveWallet,
            getWallet,
            getMint,
            setKeysetNotReserve,
            connectReserve,
            setToMain,
            setDefaultWallet,
            addWallet,
            addWalletFromMintUrl,
            isMintTrusted,
            activeUnit,
            setActiveUnit: setUnit,
         }}
      >
         {children}
      </CashuContext.Provider>
   );
};

export const useCashuContext = () => {
   const context = useContext(CashuContext);
   if (context === undefined) {
      throw new Error('useCashu must be used within a CashuProvider');
   }
   return context;
};

import React, { createContext, useState, useContext, useEffect } from 'react';
import { CashuMint, CashuWallet, MintKeys } from '@cashu/cashu-ts';
import { Wallet as StoredKeyset } from '@/types';
import { useAppDispatch } from '@/redux/store';
import { addKeyset, setMainKeyset, updateKeysetStatus } from '@/redux/slices/Wallet.slice';

interface CashuContextType {
   mints: Map<string, CashuMint>;
   wallets: Map<string, CashuWallet>;
   activeWallet: CashuWallet | null;
   reserveWallet: CashuWallet | null;
   getWallet: (id: string) => CashuWallet | undefined;
   getMint: (url: string) => CashuMint | undefined;
   setKeysetNotReserve: () => void;
   connectReserve: (usdKeyset: MintKeys, mintUrl: string) => void;
   setToMain: (keysetId: string) => void;
   addWallet: (usdKeyset: MintKeys, mintUrl: string, opts?: { active: boolean }) => void;
}

const CashuContext = createContext<CashuContextType | undefined>(undefined);

export const CashuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [mints, setMints] = useState<Map<string, CashuMint>>(new Map());
   const [wallets, setWallets] = useState<Map<string, CashuWallet>>(new Map());
   const [activeWallet, setActiveWallet] = useState<CashuWallet | null>(null);
   const [reserveWallet, setReserveWallet] = useState<CashuWallet | null>(null);

   const dispatch = useAppDispatch();

   useEffect(() => {
      const initMints = (keysets: StoredKeyset[]) => {
         const uniqueUrls = new Set(keysets.map(({ url }) => url));
         const mintsMap = new Map(Array.from(uniqueUrls).map(url => [url, new CashuMint(url)]));
         setMints(mintsMap);
         return mintsMap;
      };

      const initWallets = (keysets: StoredKeyset[], mints: Map<string, CashuMint>) => {
         const walletMap = new Map(
            keysets.map(k => {
               const mint = mints.get(k.url) as CashuMint;
               if (k.active) {
                  setActiveWallet(new CashuWallet(mint, { keys: k.keys }));
               }
               if (k.isReserve) {
                  setReserveWallet(new CashuWallet(mint, { keys: k.keys }));
               }
               return [k.id, new CashuWallet(mint, { keys: k.keys })];
            }),
         );
         setWallets(walletMap);
      };

      const init = () => {
         console.log('init cashu context');
         const keysets = JSON.parse(localStorage.getItem('keysets') || '[]') as StoredKeyset[];
         const newMintsMap = initMints(keysets);
         initWallets(keysets, newMintsMap);
      };

      init();
   }, []);

   const setKeysetNotReserve = () => {
      if (!reserveWallet) {
         return;
      }

      setReserveWallet(null);
      dispatch(updateKeysetStatus({ id: reserveWallet.keys.id, isReserve: false }));
   };

   const connectReserve = (usdKeyset: MintKeys, mintUrl: string) => {
      const mint = mints.get(mintUrl) || new CashuMint(mintUrl);
      const wallet = wallets.get(usdKeyset.id) || new CashuWallet(mint, { keys: usdKeyset });

      dispatch(addKeyset({ keyset: usdKeyset, url: mintUrl, isReserve: true }));
      dispatch(setMainKeyset(usdKeyset.id));

      if (!wallets.has(usdKeyset.id)) {
         setWallets(new Map(wallets.set(usdKeyset.id, wallet)));
      }

      setReserveWallet(wallet);
      setActiveWallet(wallet);
   };

   const setToMain = (keysetId: string) => {
      const wallet = wallets.get(keysetId);
      if (!wallet) {
         return;
      }

      setActiveWallet(wallet);
      dispatch(setMainKeyset(keysetId));
   };

   const addWallet = (usdKeyset: MintKeys, mintUrl: string, opts?: { active: boolean }) => {
      const mint = mints.get(mintUrl) || new CashuMint(mintUrl);
      const wallet = new CashuWallet(mint, { keys: usdKeyset });
      setWallets(new Map(wallets.set(usdKeyset.id, wallet)));
      if (opts?.active) {
         setActiveWallet(wallet);
      }
      dispatch(addKeyset({ keyset: usdKeyset, url: mintUrl, active: opts?.active || false }));
   };

   const getWallet = (id: string) => wallets.get(id);

   const getMint = (url: string) => mints.get(url);

   return (
      <CashuContext.Provider
         value={{
            mints,
            wallets,
            activeWallet,
            reserveWallet,
            getWallet,
            getMint,
            setKeysetNotReserve,
            connectReserve,
            setToMain,
            addWallet,
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

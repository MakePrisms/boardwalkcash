import React, { createContext, useState, useContext, useEffect } from 'react';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { Wallet as StoredKeyset } from '@/types';

interface CashuContextType {
   mints: Map<string, CashuMint>;
   wallets: Map<string, CashuWallet>;
   activeWallet: CashuWallet | null;
   reserveWallet: CashuWallet | null;
   getWallet: (id: string) => CashuWallet | undefined;
   getMint: (url: string) => CashuMint | undefined;
}

const CashuContext = createContext<CashuContextType | undefined>(undefined);

export const CashuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [mints, setMints] = useState<Map<string, CashuMint>>(new Map());
   const [wallets, setWallets] = useState<Map<string, CashuWallet>>(new Map());
   const [activeWallet, setActiveWallet] = useState<CashuWallet | null>(null);
   const [reserveWallet, setReserveWallet] = useState<CashuWallet | null>(null);

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

   const getWallet = (id: string) => wallets.get(id);

   const getMint = (url: string) => mints.get(url);

   return (
      <CashuContext.Provider
         value={{ mints, wallets, activeWallet, reserveWallet, getWallet, getMint }}
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

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { CashuMint, CashuWallet, MintActiveKeys, MintKeys } from '@cashu/cashu-ts';
import { Currency, Wallet as StoredKeyset } from '@/types';
import { RootState, useAppDispatch } from '@/redux/store';
import {
   addKeyset,
   setDefaultUnit,
   setMainKeyset,
   updateKeysetStatus,
} from '@/redux/slices/Wallet.slice';
import { useSelector } from 'react-redux';
import { setReceiveModeAction, setSendModeAction } from '@/redux/slices/UserSlice';
import { updateUser } from '@/utils/appApiRequests';

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
   setNWCAsMain: () => void;
   toggleMintlessMode: (enable: boolean) => void;
   nwcIsMain: boolean;
}

const CashuContext = createContext<CashuContextType | undefined>(undefined);

export const CashuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [mints, setMints] = useState<Map<string, MintWithWallets>>(new Map());
   const [wallets, setWallets] = useState<Map<string, CashuWallet>>(new Map());
   const [activeWallet, setActiveWallet] = useState<CashuWallet | null>(null);
   const [defaultWallets, setDefaultWallets] = useState<Map<Currency, CashuWallet>>(new Map());
   const [reserveWallet, setReserveWallet] = useState<CashuWallet | null>(null);
   const [activeUnit, setActiveUnit] = useState<Currency>(Currency.USD);
   const [nwcIsMain, setNWCIsMain] = useState(false);
   const user = useSelector((state: RootState) => state.user);
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
                  if (k.keys.unit === user.defaultUnit) {
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
         if (user.nwcUri && !defaultWalletsMap.has(Currency.SAT)) {
            setNWCIsMain(true);
         }
         localStorage.setItem(
            'defaultWallets',
            JSON.stringify(Object.fromEntries(defaultWalletsMap)),
         );
      };

      const init = () => {
         console.log('init cashu context');
         console.log('defaultUnit', user.defaultUnit);
         const keysets = JSON.parse(localStorage.getItem('keysets') || '[]') as StoredKeyset[];
         const newMintsMap = initMints(keysets);
         initWallets(keysets, newMintsMap);
         setActiveUnit(user.defaultUnit as Currency);
      };

      init();
   }, [user.defaultUnit, user.nwcUri]);

   useEffect(() => {
      const changeStatusBarColor = (color: string) => {
         // For Android
         const metaThemeColor = document.querySelector('meta[name="theme-color"]');
         if (metaThemeColor) {
            metaThemeColor.setAttribute('content', color);
         }

         // For iOS
         const metaAppleStatusBar = document.querySelector(
            'meta[name="apple-mobile-web-app-status-bar-style"]',
         );
         if (metaAppleStatusBar) {
            metaAppleStatusBar.setAttribute('content', 'black-translucent');
         }

         // Create or update a style tag for iOS status bar and body
         let style = document.getElementById('ios-status-bar-style');
         if (!style) {
            style = document.createElement('style');
            style.id = 'ios-status-bar-style';
            document.head.appendChild(style);
         }
         style.innerHTML = `
          @supports (-webkit-touch-callout: none) {
            body::after {
              content: '';
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: env(safe-area-inset-top);
              background-color: ${color};
              z-index: 10000;
            }
          }
          body {
            background-color: ${color};
          }
        `;

         // Create a new style tag for the transition
         const transitionStyle = document.createElement('style');
         transitionStyle.innerHTML = `
           body, body::after {
             transition: background-color 0.3s ease;
           }
         `;
         document.head.appendChild(transitionStyle);

         // Remove the transition style after the transition is complete
         setTimeout(() => {
            transitionStyle.remove();
         }, 300);
      };

      if (activeUnit === Currency.USD) {
         changeStatusBarColor('#0f3470');
      } else {
         changeStatusBarColor('#1D4D98');
      }
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
      if (unit === Currency.SAT) {
         /* setting another sat wallet as main, disable mintless mode */
         toggleMintlessMode(false);
         setNWCIsMain(false);
      }
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
         activeUnit: activeUnit,
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
         /* find keyset that is hex and matches the currency */
         const k = keysets.find(k => k.unit === currency && /^[0-9A-Fa-f]+$/.test(k.id));
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

   const toggleMintlessMode = (enable: boolean) => {
      /* if mintless mode is already enabled and trying to enable it, do nothing */
      if (user.sendMode === 'mintless' && user.receiveMode === 'mintless' && enable) {
         return;
      }
      /* if mintless mode is already disabled and trying to disable it, do nothing */
      if (user.sendMode === 'default_mint' && user.receiveMode === 'default_mint' && !enable) {
         return;
      }

      if (enable) {
         dispatch(setSendModeAction('mintless'));
         dispatch(setReceiveModeAction('mintless'));
         updateUser(user.pubkey!, { mintlessReceive: true }).catch(console.error);
      } else {
         dispatch(setSendModeAction('default_mint'));
         dispatch(setReceiveModeAction('default_mint'));
         updateUser(user.pubkey!, { mintlessReceive: false }).catch(console.error);
      }
   };

   const setUnit = (unit: Currency) => {
      const defaultWallet = defaultWallets.get(unit);
      console.log('setting unit to ', unit);
      const inMintlessMode = user.sendMode === 'mintless' && user.receiveMode === 'mintless';
      if (inMintlessMode || nwcIsMain) {
         if (unit === Currency.USD) {
            console.log('disabling mintless mode');
            toggleMintlessMode(false);
            if (!defaultWallet) throw new Error('No default wallet found for USD');
            setToMain(defaultWallet.keys.id);
         } else if (unit === Currency.SAT && nwcIsMain) {
            console.log('enabling mintless mode');
            toggleMintlessMode(true);
         }
      }
      if (defaultWallet) {
         console.log('default wallet found for unit', defaultWallet);
         setToMain(defaultWallet.keys.id);
      }
      setActiveUnit(unit);
      dispatch(setDefaultUnit(unit));
   };

   const setNWCAsMain = () => {
      if (!user.nwcUri) throw new Error('No NWC URI found');
      const previousDefaultBTCWallet = defaultWallets.get(Currency.SAT);
      if (previousDefaultBTCWallet) {
         dispatch(updateKeysetStatus({ id: previousDefaultBTCWallet.keys.id, active: false }));
      }
      /* remove active sat wallet */
      const newDefaultWallets = new Map(defaultWallets);
      newDefaultWallets.delete(Currency.SAT);
      setDefaultWallets(newDefaultWallets);
      if (activeUnit === Currency.SAT) {
         /* will use mintless mode instead of active wallet */
         setActiveWallet(null);

         /* Enable mintless mode */
         toggleMintlessMode(true);
      } else if (activeUnit === Currency.USD) {
         // Disable mintless mode
         if (user.receiveMode === 'mintless' && user.sendMode === 'mintless') {
            toggleMintlessMode(false);
         }
      }

      localStorage.setItem('defaultWallets', JSON.stringify(Object.fromEntries(newDefaultWallets)));
      setNWCIsMain(true);
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
            setNWCAsMain,
            nwcIsMain,
            toggleMintlessMode,
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

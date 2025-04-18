import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useProofStorage } from '@/hooks/cashu/useProofStorage';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';

interface BalanceContextType {
   displayBalance: string;
   unitSymbol: string;
   toggleFxValue: () => void;
   showFxValue: boolean;
   activeUnit: string;
   loading: boolean;
   satBalance: number | null;
   usdBalance: number | null;
   satBalanceInUsd: number | null;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
   const { balanceByWallet } = useProofStorage();
   const { wallets, activeWallet, activeUnit } = useCashuContext();
   const { satsToUnit, unitToSats } = useExchangeRate();
   const [usdBalance, setUsdBalance] = useState<number | null>(null);
   const [satBalance, setSatBalance] = useState<number | null>(null);
   const [satBalanceInUsd, setSatBalanceInUsd] = useState<number | null>(null);
   const [showFxValue, setShowFxValue] = useState(false);
   const [displayBalance, setDisplayBalance] = useState('');
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const loadBalances = async () => {
         if (!wallets.size) {
            setLoading(false);
            return;
         }

         let newUsdBalance = 0;
         let newSatBalance = 0;

         for (const [keysetId, balance] of Object.entries(balanceByWallet)) {
            const wallet = wallets.get(keysetId);
            if (!wallet) continue;
            if (wallet.keys.unit === 'usd') {
               newUsdBalance += balance;
            } else if (wallet.keys.unit === 'sat') {
               newSatBalance += balance;
            } else {
               throw new Error('Invalid unit');
            }
         }

         setUsdBalance(newUsdBalance);
         setSatBalance(newSatBalance);
         setLoading(false);

         // Convert satBalance to USD
         if (newSatBalance > 0) {
            const satBalanceUsd = await satsToUnit(newSatBalance, 'usd');
            setSatBalanceInUsd(satBalanceUsd);
         } else {
            setSatBalanceInUsd(0);
         }
      };

      loadBalances();
   }, [balanceByWallet, wallets, satsToUnit]);

   const formatUsdBalance = (balance: number) => {
      return (balance / 100).toFixed(2);
   };

   const getDisplayBalance = async () => {
      if (usdBalance === null || satBalance === null) return '';

      if (!showFxValue) {
         return activeUnit === 'usd' ? formatUsdBalance(usdBalance) : satBalance?.toLocaleString();
      } else {
         if (activeUnit === 'usd') {
            const sats = await unitToSats(usdBalance / 100, 'usd');
            return sats?.toLocaleString();
         } else {
            const usd = await satsToUnit(satBalance, 'usd');
            return formatUsdBalance(usd);
         }
      }
   };

   useEffect(() => {
      const updateDisplayBalance = async () => {
         const newDisplayBalance = await getDisplayBalance();
         setDisplayBalance(newDisplayBalance);
      };

      updateDisplayBalance();
   }, [showFxValue, usdBalance, satBalance, activeUnit]);

   useEffect(() => {
      setShowFxValue(false);
   }, [activeUnit]);

   const toggleFxValue = () => {
      setShowFxValue(prev => !prev);
   };

   const unitSymbol = useMemo(() => {
      return showFxValue ? (activeUnit === 'usd' ? '₿' : '$') : activeUnit === 'usd' ? '$' : '₿';
   }, [showFxValue, activeUnit]);

   const value = {
      displayBalance,
      unitSymbol,
      toggleFxValue,
      showFxValue,
      activeUnit,
      loading,
      usdBalance,
      satBalance,
      satBalanceInUsd,
   };

   return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>;
};

export const useBalance = () => {
   const context = useContext(BalanceContext);
   if (context === undefined) {
      throw new Error('useBalance must be used within a BalanceProvider');
   }
   return context;
};

import { useCashuContext } from '@/hooks/contexts/cashuContext';
import React, { useState, useEffect } from 'react';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { formatSats } from '@/utils/formatting';
import { format } from 'path';

const Balance = ({ balanceByWallet }: { balanceByWallet: Record<string, number> }) => {
   const { wallets, activeWallet, activeUnit } = useCashuContext();
   const [usdBalance, setUsdBalance] = useState(0);
   const [satBalance, setSatBalance] = useState(0);
   const [showFxValue, setShowFxValue] = useState(false);
   const { satsToUnit, unitToSats } = useExchangeRate();

   useEffect(() => {
      if (!wallets.size) return;
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
   }, [balanceByWallet, wallets]);

   const handleClick = () => {
      setShowFxValue(prev => !prev);
   };

   const formatUsdBalance = (balance: number) => {
      return (balance / 100).toFixed(2);
   };

   const getDisplayBalance = async () => {
      if (!showFxValue) {
         return activeUnit === 'usd' ? formatUsdBalance(usdBalance) : satBalance.toLocaleString();
      } else {
         if (activeUnit === 'usd') {
            const sats = await unitToSats(usdBalance / 100, 'usd');
            return sats.toLocaleString();
         } else {
            const usd = await satsToUnit(satBalance, 'usd');
            return formatUsdBalance(usd);
         }
      }
   };

   const [displayBalance, setDisplayBalance] = useState('');

   useEffect(() => {
      getDisplayBalance().then(setDisplayBalance);
   }, [showFxValue, usdBalance, satBalance, activeUnit]);

   const unitSymbol = showFxValue
      ? activeUnit === 'usd'
         ? '₿'
         : '$'
      : activeUnit === 'usd'
        ? '$'
        : '₿';

   return (
      <div className='flex flex-col items-center justify-center w-full mb-14'>
         <div className='cursor-pointer' onClick={handleClick}>
            {activeUnit === 'usd' && !showFxValue && (
               <span className='text-5xl text-cyan-teal font-bold'>{unitSymbol}</span>
            )}
            {activeUnit === 'sat' && showFxValue && (
               <span className='text-5xl text-cyan-teal font-bold'>{unitSymbol}</span>
            )}
            <span className='font-teko text-6xl font-bold'>{displayBalance}</span>
            {(activeUnit === 'sat' && !showFxValue) || (activeUnit === 'usd' && showFxValue) ? (
               <span className='text-5xl text-cyan-teal font-bold'>{unitSymbol}</span>
            ) : null}
         </div>
      </div>
   );
};

export default Balance;

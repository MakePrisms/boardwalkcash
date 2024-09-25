import { useCashuContext } from '@/hooks/contexts/cashuContext';
import React, { useState, useEffect } from 'react';

const Balance = ({ balanceByWallet }: { balanceByWallet: Record<string, number> }) => {
   const { wallets, activeWallet } = useCashuContext();
   const [unit, setUnit] = useState<'usd' | 'sat'>(
      (activeWallet?.keys.unit as 'usd' | 'sat') || 'usd',
   );
   const [usdBalance, setUsdBalance] = useState(0);
   const [satBalance, setSatBalance] = useState(0);

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
      setUnit(prevUnit => (prevUnit === 'sat' ? 'usd' : 'sat'));
   };

   const formatUsdBalance = (balance: number) => {
      return (balance / 100).toFixed(2);
   };

   const unitSymbol = unit === 'usd' ? '$' : '₿';

   return (
      <div className='flex flex-col items-center justify-center w-full mb-14'>
         <button className='' onClick={handleClick}>
            <span className=' text-5xl text-cyan-teal font-bold'>{unitSymbol}</span>
            <span className='font-teko text-6xl font-bold'>
               {unit === 'usd' ? formatUsdBalance(usdBalance) : satBalance}
            </span>{' '}
         </button>
      </div>
   );
};

export default Balance;

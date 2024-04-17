import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { useExchangeRate } from '@/hooks/useExchangeRate';

const Balance = ({ balance }: { balance: number }) => {
   const [usdBtc, setUsdBtc] = useState(0);
   const [unit, setUnit] = useState('usd');
   const [usdBalance, setUsdBalance] = useState('0.00');
   const [exchangeError, setExchangeError] = useState(false);

   useEffect(() => {
      const setBalance = async () => {};
      setBalance();
   }, []);

   const updateUsdBalance = (newBalance = balance) => {
      const balanceCents = newBalance;
      if (balanceCents <= 0) {
         setUsdBalance('0.00');
      } else {
         console.log('balanceCents:', balanceCents);
         const balanceDollars = balanceCents / 100;
         console.log('balanceDollars:', balanceDollars);
         setUsdBalance(balanceDollars.toFixed(2));
      }
   };

   useEffect(() => {
      updateUsdBalance();
   }, [balance, usdBtc, unit]);

   const handleClick = () => {
      // Toggle unit and optionally update usdBalance if switching to "usd"
      setUnit(prevUnit => {
         const newUnit = prevUnit === 'sats' ? 'usd' : 'sats';
         if (newUnit === 'usd') {
            updateUsdBalance();
         }
         return newUnit;
      });
   };

   return (
      <div className='flex flex-col items-center justify-center w-full h-full mb-14'>
         <h1 className='mb-4 hover:cursor-pointer'>
            <span className='font-teko text-6xl font-bold'>
               {/* {unit === 'sats' ? balance : usdBalance} */}
               {usdBalance}
            </span>{' '}
            <span className='font-5xl text-cyan-teal font-bold'>{unit}</span>
         </h1>
         {exchangeError && unit === 'usd' && (
            <p className='text-red-600'>error fetching exchange rate</p>
         )}
      </div>
   );
};

export default Balance;

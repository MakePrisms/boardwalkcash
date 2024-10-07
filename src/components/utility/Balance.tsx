import React from 'react';
import { useBalance } from '@/hooks/boardwalk/useBalance';

const Balance = () => {
   const { displayBalance, unitSymbol, toggleFxValue, showFxValue, activeUnit } = useBalance();

   return (
      <div className='flex flex-col items-center justify-center w-full'>
         <div className='cursor-pointer' onClick={toggleFxValue}>
            {activeUnit === 'usd' && !showFxValue && (
               <span className='text-[3.45rem] text-cyan-teal font-bold'>{unitSymbol}</span>
            )}
            {activeUnit === 'sat' && showFxValue && (
               <span className='text-[3.45rem] text-cyan-teal font-bold'>{unitSymbol}</span>
            )}
            <span className={`font-teko text-6xl font-bold`}>{displayBalance}</span>
            {(activeUnit === 'sat' && !showFxValue) || (activeUnit === 'usd' && showFxValue) ? (
               <span className='text-[3.45em] text-cyan-teal font-bold'>{unitSymbol}</span>
            ) : null}
         </div>
      </div>
   );
};

export default Balance;

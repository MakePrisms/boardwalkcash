import React from 'react';
import { useBalance } from '@/hooks/boardwalk/useBalance';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { Currency } from '@/types';

const Balance = () => {
   const { displayBalance, unitSymbol, toggleFxValue, showFxValue, activeUnit } = useBalance();
   const { activeUnit: contextActiveUnit } = useCashuContext();

   // const unitSymbolColor = contextActiveUnit === Currency.USD ? '#26a69a' : '#6a26a6';
   const unitSymbolColor = '#26a69a';

   return (
      <div className='flex flex-col items-center justify-center w-full'>
         <div className='cursor-pointer' onClick={toggleFxValue}>
            {activeUnit === 'usd' && !showFxValue && (
               <span className='text-[3.45rem] font-bold' style={{ color: unitSymbolColor }}>
                  {unitSymbol}
               </span>
            )}
            {activeUnit === 'sat' && showFxValue && (
               <span className='text-[3.45rem] font-bold' style={{ color: unitSymbolColor }}>
                  {unitSymbol}
               </span>
            )}
            <span className={`font-teko text-6xl font-bold`}>{displayBalance}</span>
            {(activeUnit === 'sat' && !showFxValue) || (activeUnit === 'usd' && showFxValue) ? (
               <span className='text-[3.45em] font-bold' style={{ color: unitSymbolColor }}>
                  {unitSymbol}
               </span>
            ) : null}
         </div>
      </div>
   );
};

export default Balance;

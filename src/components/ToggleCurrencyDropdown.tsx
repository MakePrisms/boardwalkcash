import React, { useState } from 'react';
import { Drawer } from 'flowbite-react';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { Currency } from '@/types';
import { useBalance } from '@/hooks/boardwalk/useBalance';
import { customDrawerTheme } from '@/themes/drawerTheme';
import { format } from 'path';
import { formatCents, formatSats } from '@/utils/formatting';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid';

const ToggleCurrencyDrawer = () => {
   const { activeUnit, setActiveUnit } = useCashuContext();
   const { satBalance, usdBalance } = useBalance();
   const [isOpen, setIsOpen] = useState(false);

   const handleToggle = (unit: Currency) => {
      setActiveUnit(unit);
      setIsOpen(false);
   };

   return (
      <>
         <button onClick={() => setIsOpen(true)} className='flex items-center'>
            {activeUnit === Currency.USD ? 'USD' : 'BTC'}
            <ChevronDownIcon className='h-5 w-5 ml-1' />
         </button>
         <Drawer
            theme={customDrawerTheme}
            position='bottom'
            onClose={() => setIsOpen(false)}
            open={isOpen}
         >
            <Drawer.Items>
               <div className='p-4 space-y-4'>
                  <div className='text-2xl'>Select Currency</div>
                  <button
                     className='w-full p-2 text-left flex justify-between items-center'
                     onClick={() => handleToggle(Currency.SAT)}
                  >
                     <span>{formatSats(satBalance || 0)}</span>
                     {activeUnit === Currency.SAT && (
                        <CheckIcon className='h-5 w-5 text-cyan-teal' />
                     )}
                  </button>
                  <button
                     className='w-full p-2 text-left flex justify-between items-center'
                     onClick={() => handleToggle(Currency.USD)}
                  >
                     <span>{formatCents(usdBalance || 0)}</span>
                     {activeUnit === Currency.USD && (
                        <CheckIcon className='h-5 w-5 text-cyan-teal' />
                     )}
                  </button>
               </div>
            </Drawer.Items>
         </Drawer>
      </>
   );
};

export default ToggleCurrencyDrawer;

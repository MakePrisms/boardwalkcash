import React, { useState } from 'react';
import { Drawer } from 'flowbite-react';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { Currency } from '@/types';
import { useBalance } from '@/hooks/boardwalk/useBalance';
import { customDrawerTheme } from '@/themes/drawerTheme';
import { formatCents, formatSats } from '@/utils/formatting';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import RadioButton from './buttons/RadioButton';

const ToggleCurrencyDrawer = () => {
   const { activeUnit, setActiveUnit } = useCashuContext();
   const { satBalance, usdBalance, satBalanceInUsd } = useBalance();
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
            className='h-2/5 drawer'
         >
            <Drawer.Items>
               <div className='p-4 space-y-4 flex flex-col items-center'>
                  <div className='text-2xl w-full max-w-xs'>Select Currency</div>
                  <div className='w-full max-w-xs'>
                     <button
                        className='w-full p-2 text-left flex justify-between items-center'
                        onClick={() => handleToggle(Currency.SAT)}
                     >
                        <div className='flex flex-col'>
                           <div className='font-semibold mb-1'>Bitcoin</div>
                           <span className='text-gray-400 text-sm'>
                              {formatSats(satBalance || 0)} (~{formatCents(satBalanceInUsd || 0)})
                              available
                           </span>
                        </div>
                        <RadioButton
                           selected={activeUnit === Currency.SAT}
                           color='cyan-teal'
                           // onChange={handleToggle}
                        />
                     </button>
                  </div>
                  <div className='w-full max-w-xs'>
                     <button
                        className='w-full p-2 text-left flex justify-between items-center'
                        onClick={() => handleToggle(Currency.USD)}
                     >
                        <div className='flex flex-col'>
                           <div className=' font-semibold mb-1'>US Dollars</div>
                           <span className='text-gray-400 text-sm'>
                              {formatCents(usdBalance || 0)} available
                           </span>
                        </div>
                        <RadioButton
                           selected={activeUnit === Currency.USD}
                           color='cyan-teal'
                           // onChange={handleToggle}
                        />
                     </button>
                  </div>
               </div>
            </Drawer.Items>
         </Drawer>
      </>
   );
};

export default ToggleCurrencyDrawer;

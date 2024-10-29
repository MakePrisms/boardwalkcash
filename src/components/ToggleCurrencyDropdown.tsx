import React, { useState } from 'react';
import { Drawer } from 'flowbite-react';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { Currency } from '@/types';
import { useBalance } from '@/hooks/boardwalk/useBalance';
import { customDrawerTheme } from '@/themes/drawerTheme';
import { formatCents, formatSats } from '@/utils/formatting';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import Tooltip from './utility/Tooltip';
import RadioButton from './buttons/utility/RadioButton';

const ToggleCurrencyDrawer = ({ className }: { className?: string }) => {
   const { activeUnit, setActiveUnit, defaultWallets } = useCashuContext();
   const { satBalance, usdBalance, satBalanceInUsd } = useBalance();
   const [isOpen, setIsOpen] = useState(false);

   const handleToggle = (unit: Currency) => {
      if (!defaultWallets.has(unit)) {
         return;
      }
      setActiveUnit(unit);
      setIsOpen(false);
   };

   return (
      <>
         <button onClick={() => setIsOpen(true)} className={`flex items-center ${className}`}>
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
                     <CurrencyOption
                        currency={Currency.SAT}
                        label='Bitcoin'
                        balance={formatSats(satBalance || 0)}
                        subBalance={formatCents(satBalanceInUsd || 0)}
                        isSelected={activeUnit === Currency.SAT}
                        isAvailable={defaultWallets.has(Currency.SAT)}
                        onSelect={handleToggle}
                     />
                  </div>
                  <div className='w-full max-w-xs'>
                     <CurrencyOption
                        currency={Currency.USD}
                        label='US Dollars'
                        balance={formatCents(usdBalance || 0)}
                        isSelected={activeUnit === Currency.USD}
                        isAvailable={defaultWallets.has(Currency.USD)}
                        onSelect={handleToggle}
                     />
                  </div>
               </div>
            </Drawer.Items>
         </Drawer>
      </>
   );
};

interface CurrencyOptionProps {
   currency: Currency;
   label: string;
   balance: string;
   subBalance?: string;
   isSelected: boolean;
   isAvailable: boolean;
   onSelect: (currency: Currency) => void;
}

const CurrencyOption: React.FC<CurrencyOptionProps> = ({
   currency,
   label,
   balance,
   subBalance,
   isSelected,
   isAvailable,
   onSelect,
}) => {
   const button = (
      <button
         className='w-full p-2 text-left flex justify-between items-center'
         onClick={() => onSelect(currency)}
      >
         <div className='flex flex-col'>
            <div className='font-semibold mb-1'>{label}</div>
            <span className='text-gray-400 text-sm'>
               {balance}
               {subBalance && ` (~${subBalance})`} available
            </span>
         </div>
         <RadioButton selected={isSelected} color='cyan-teal' disabled={!isAvailable} />
      </button>
   );

   if (!isAvailable) {
      return (
         <Tooltip
            position='top'
            content={`Add a ${label} account to change your active currency`}
            className='w-full text-lg'
         >
            {button}
         </Tooltip>
      );
   }

   return button;
};

export default ToggleCurrencyDrawer;

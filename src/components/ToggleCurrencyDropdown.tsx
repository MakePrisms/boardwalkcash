import React from 'react';
import { Dropdown } from 'flowbite-react';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { Currency } from '@/types';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid';

const ToggleCurrencyDropdown = () => {
   const { activeUnit, setActiveUnit, defaultWallets } = useCashuContext();

   const availableUnits = Array.from(defaultWallets.keys());

   const handleClick = () => {
      const otherUnit = availableUnits.find(unit => unit !== activeUnit);
      console.log('otherUnit', otherUnit);
      if (otherUnit) {
         setActiveUnit(otherUnit as Currency);
      }
   };

   return (
      <button onClick={handleClick}>
         <div className='flex items-center space-x-2'>
            {activeUnit.toUpperCase()}
            {activeUnit === Currency.USD ? (
               <ChevronDownIcon className='h-5 w-5' />
            ) : (
               <ChevronUpIcon className='h-5 w-5' />
            )}
         </div>
      </button>
      // <Dropdown onClick={handleClick} label={activeUnit.toUpperCase()} inline>
      //    {/* {availableUnits.map(unit => (
      //       <Dropdown.Item key={unit} onClick={() => setActiveUnit(unit as Currency)}>
      //          {unit.toUpperCase()}
      //       </Dropdown.Item>
      //    ))} */}
      // </Dropdown>
   );
};

export default ToggleCurrencyDropdown;

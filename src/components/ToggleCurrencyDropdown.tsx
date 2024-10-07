import React, { useMemo } from 'react';
import { Dropdown } from 'flowbite-react';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { Currency } from '@/types';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid';

const ToggleCurrencyDropdown = () => {
   const { activeUnit, setActiveUnit, defaultWallets, nwcIsMain } = useCashuContext();

   const availableUnits = useMemo(() => {
      console.log('nwcIsMain', nwcIsMain);
      const availableUnits = Array.from(defaultWallets.keys());
      if (nwcIsMain) {
         availableUnits.push(Currency.SAT);
      }
      return availableUnits;
   }, [defaultWallets, nwcIsMain]);

   const handleClick = () => {
      const otherUnit = availableUnits.find(unit => unit !== activeUnit);
      console.log('otherUnit', otherUnit);
      if (otherUnit) {
         setActiveUnit(otherUnit as Currency);
      }
   };

   return (
      <Dropdown onClick={handleClick} label={activeUnit === Currency.USD ? 'USD' : 'BTC'} inline>
         {availableUnits
            .filter(unit => unit !== activeUnit)
            .map(unit => (
               <Dropdown.Item key={unit} onClick={() => setActiveUnit(unit as Currency)}>
                  {unit === Currency.USD ? 'USD' : 'BTC'}
               </Dropdown.Item>
            ))}
      </Dropdown>
   );
};

export default ToggleCurrencyDropdown;

import React from 'react';
import { Dropdown } from 'flowbite-react';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { Currency } from '@/types';

const ToggleCurrencyDropdown = () => {
   const { activeUnit, setActiveUnit, defaultWallets } = useCashuContext();

   const availableUnits = Array.from(defaultWallets.keys());

   return (
      <Dropdown label={activeUnit.toUpperCase()} inline>
         {availableUnits.map(unit => (
            <Dropdown.Item key={unit} onClick={() => setActiveUnit(unit as Currency)}>
               {unit.toUpperCase()}
            </Dropdown.Item>
         ))}
      </Dropdown>
   );
};

export default ToggleCurrencyDropdown;

import React, { Dispatch, SetStateAction, useEffect, useMemo } from 'react';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { Currency } from '@/types';

interface AmountProps {
   value: string | number;
   setValue?: Dispatch<SetStateAction<string>>;
   unit?: Currency;
   showUnitPrefix?: boolean;
   showUnitSuffix?: boolean;
   className?: string;
   unitClassName?: string;
   isDollarAmount?: boolean;
}

const Amount: React.FC<AmountProps> = ({
   value,
   setValue,
   unit,
   showUnitPrefix = true,
   showUnitSuffix = false,
   className = 'font-teko text-6xl font-bold',
   unitClassName = 'text-[3.45rem] text-cyan-teal font-bold',
   isDollarAmount = false /* if false it means when unit === 'usd' we have to multiply by 100 */,
}) => {
   const { activeUnit } = useCashuContext();

   const getUnitSymbol = () => {
      switch (unit) {
         case 'usd':
            return '$';
         case 'sat':
            return '₿';
         default:
            return '';
      }
   };

   /* Format the display value based on unit and add commas */
   const { formattedValue, greyZeros } = useMemo(() => {
      const stringValue = value.toString();
      if (unit === Currency.USD) {
         /* Handle case where input starts with decimal */
         const val = stringValue.startsWith('.') ? `0${stringValue}` : stringValue;

         /* If not a dollar amount, multiply by 100 since input is in cents */
         const numericValue = isDollarAmount ? Number(val) : Number(val) / 100;

         if (val === '') return { formattedValue: '0', greyZeros: '' };

         /* Check if value contains decimal */
         const hasDecimal = val.includes('.');
         const decimalParts = val.split('.');

         if (!hasDecimal) {
            return { formattedValue: numericValue.toLocaleString('en-US'), greyZeros: '' };
         }

         /* Format with 2 decimal places if decimal exists */
         const decimals = decimalParts[1] || '';
         const formatted = `${decimalParts[0]}.${decimals}`;
         const greyZerosCount = 2 - decimals.length;
         const greyZeros = greyZerosCount > 0 ? '0'.repeat(greyZerosCount) : '';

         return { formattedValue: formatted, greyZeros };
      }

      const val = stringValue.startsWith('.') ? `0${stringValue}` : stringValue;
      return {
         formattedValue: val === '' ? '0' : Number(val).toLocaleString('en-US'),
         greyZeros: '',
      };
   }, [value, unit, isDollarAmount]);

   useEffect(() => {
      const handleNumpadInput = (input: string) => {
         if (!setValue) return;
         const stringValue = value.toString();

         if (input === '.') {
            /* Only add decimal if one doesn't exist yet and we're in USD mode */
            if (!stringValue.includes('.') && activeUnit === Currency.USD) {
               setValue(prev => prev + input);
            }
            return;
         }

         /* If we already have 2 decimal places, don't add more digits */
         const decimalIndex = stringValue.indexOf('.');
         if (decimalIndex !== -1 && stringValue.length - decimalIndex > 2) {
            return;
         }

         setValue(prev => prev + input);
      };

      const handleKeyPress = (e: KeyboardEvent) => {
         const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
         const showDecimal = activeUnit === Currency.USD;

         if (numbers.includes(e.key) || e.key === '0') {
            handleNumpadInput(e.key);
         } else if (e.key === '.' && showDecimal) {
            handleNumpadInput('.');
         } else if (e.key === 'Backspace') {
            setValue && setValue(prev => prev.slice(0, -1));
         }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
   }, [activeUnit]);

   return (
      <div className='inline-flex items-center'>
         {unit && unit !== 'sat' && showUnitPrefix && (
            <span className={unitClassName}>{getUnitSymbol()}</span>
         )}
         <span className={`${className} pt-2`}>
            {formattedValue}
            {greyZeros && <span className='text-gray-400'>{greyZeros}</span>}
         </span>
         {unit && (unit === 'sat' || showUnitSuffix) && (
            <span className={unitClassName}>{getUnitSymbol()}</span>
         )}
      </div>
   );
};

export default Amount;

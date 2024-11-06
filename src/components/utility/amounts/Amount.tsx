import { Currency } from '@/types';
import React, { useMemo } from 'react';

interface AmountProps {
   value: string | number;
   unit: Currency;
   className?: string;
   unitClassName?: string;
   isDollarAmount?: boolean;
}

const Amount: React.FC<AmountProps> = ({
   value,
   unit,
   className = 'font-teko text-6xl font-bold',
   unitClassName = 'text-[3.45rem] text-cyan-teal font-bold',
   isDollarAmount = false /* if false it means when unit === 'usd' we have to multiply by 100 */,
}) => {
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

   const showUnit = unit === Currency.USD ? 'prefix' : 'suffix';

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

   return (
      <div className='inline-flex items-center'>
         {showUnit === 'prefix' && <span className={unitClassName}>{getUnitSymbol()}</span>}
         <span className={className}>
            {formattedValue}
            {greyZeros && <span className='text-gray-400'>{greyZeros}</span>}
         </span>
         {showUnit === 'suffix' && <span className={unitClassName}>{getUnitSymbol()}</span>}
      </div>
   );
};

export default Amount;

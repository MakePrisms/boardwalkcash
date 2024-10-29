import { Currency } from '@/types';
import React, { useMemo } from 'react';

interface AmountProps {
   value: string | number;
   unit?: Currency;
   showUnitPrefix?: boolean;
   showUnitSuffix?: boolean;
   className?: string;
   unitClassName?: string;
   isDollarAmount?: boolean;
}

const Amount: React.FC<AmountProps> = ({
   value,
   unit,
   showUnitPrefix = true,
   showUnitSuffix = false,
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

   /* Format the display value based on unit and add commas */
   const formattedValue = useMemo(() => {
      const stringValue = value.toString();
      if (unit === Currency.USD) {
         /* Handle case where input starts with decimal */
         const val = stringValue.startsWith('.') ? `0${stringValue}` : stringValue;

         /* If not a dollar amount, multiply by 100 since input is in cents */
         const numericValue = isDollarAmount ? Number(val) : Number(val) / 100;

         return val === ''
            ? '0.00'
            : numericValue.toLocaleString('en-US', {
                 minimumFractionDigits: 2,
                 maximumFractionDigits: 2,
              });
      }
      const val = stringValue.startsWith('.') ? `0${stringValue}` : stringValue;
      return val === '' ? '0' : Number(val).toLocaleString('en-US');
   }, [value, unit, isDollarAmount]);

   return (
      <div className='inline-flex items-center'>
         {unit && showUnitPrefix && <span className={unitClassName}>{getUnitSymbol()}</span>}
         <span className={className}>{formattedValue}</span>
         {unit && showUnitSuffix && <span className={unitClassName}>{getUnitSymbol()}</span>}
      </div>
   );
};

export default Amount;

import { convertToUnit } from '@/utils/convertToUnit';
import Amount from '../utility/amounts/Amount';
import { formatUnit } from '@/utils/formatting';
import { useEffect, useMemo, useState } from 'react';
import { Currency } from '@/types';

interface PaymentConfirmationDetailsProps {
   destination: string;
   amount: number;
   unit: Currency;
   fee?: number;
}

const PaymentConfirmationDetails = ({
   destination,
   amount,
   unit,
   fee,
}: PaymentConfirmationDetailsProps) => {
   const [equivalentAmount, setEquivalentAmount] = useState<number | null>(null);
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      const getEquivalentAmount = async () => {
         setIsLoading(true);
         try {
            if (unit === Currency.SAT) {
               const usdAmount = await convertToUnit(amount, 'sat', 'usd');
               setEquivalentAmount(usdAmount);
            } else {
               const satAmount = await convertToUnit(amount, unit, 'sat');
               setEquivalentAmount(satAmount);
            }
         } finally {
            setIsLoading(false);
         }
      };
      getEquivalentAmount();
   }, [amount, unit]);

   const formattedDestintation = useMemo(() => {
      if (destination.length > 20) {
         return destination.slice(0, 10) + '...' + destination.slice(-10);
      }
      return destination;
   }, [destination]);

   if (isLoading) {
      return <div className='flex flex-col gap-4 '>{null}</div>;
   }

   const isShowingUsdEquivalent = unit === Currency.SAT;
   const equivalantUnit = unit === Currency.SAT ? 'usd' : 'sat';
   const equivalantAmtLabel = isShowingUsdEquivalent ? 'USD Equivalent' : 'Sats Equivalent';

   return (
      <div className='flex flex-col gap-4'>
         <h2 className='text-xl'>Confirm Payment</h2>
         <div className='flex justify-between items-center gap-3'>
            <span className='text-gray-500'>Amount</span>
            <span>
               <Amount
                  value={amount}
                  unit={unit}
                  className='text-3xl text-black font-teko font-bold'
                  unitClassName='text-2xl text-cyan-teal font-bold pt-1'
               />
            </span>
         </div>
         {fee && (
            <div className='flex justify-between items-center gap-4'>
               <span className='text-gray-500'>Estimated Fee</span>
               <span>{formatUnit(fee, unit)}</span>
            </div>
         )}

         <div className='flex justify-between items-center gap-4'>
            <span className='text-gray-500'>{equivalantAmtLabel}</span>
            {equivalentAmount !== null ? (
               <span>
                  {isShowingUsdEquivalent && '~'}
                  {formatUnit(equivalentAmount, equivalantUnit)}
               </span>
            ) : null}
         </div>

         <div className='flex justify-between items-center gap-4'>
            <span className='text-gray-500'>Paying</span>
            <span>{formattedDestintation}</span>
         </div>
      </div>
   );
};

export default PaymentConfirmationDetails;

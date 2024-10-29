import Amount from '@/components/utility/amounts/Amount';
import { formatUnit } from '@/utils/formatting';
import { Currency } from '@/types';

interface ActiveAndInactiveAmountsProps {
   usdCentsAmount: number;
   activeUnit: Currency;
   className?: string;
   satAmount: number;
}

const ActiveAndInactiveAmounts = ({
   usdCentsAmount,
   satAmount,
   activeUnit,
   className = 'flex flex-col justify-center items-center',
}: ActiveAndInactiveAmountsProps) => {
   const inactiveAmount = activeUnit === Currency.USD ? satAmount : usdCentsAmount;
   const activeAmount = activeUnit === Currency.USD ? usdCentsAmount : satAmount;

   return (
      <div className={className}>
         <div className='flex justify-between items-center'>
            <span className='text-xl'>Amount: </span>
            <Amount
               unitClassName='text-[2rem] text-cyan-teal font-bold'
               className='font-teko text-3xl font-bold text-black'
               value={activeAmount}
               unit={activeUnit}
            />
         </div>
         <div className='flex justify-center items-center text-gray-500 text-lg text-center'>
            {formatUnit(inactiveAmount, activeUnit === Currency.USD ? 'sat' : 'usd')}
         </div>
      </div>
   );
};

export default ActiveAndInactiveAmounts;

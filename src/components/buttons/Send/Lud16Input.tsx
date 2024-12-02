import Amount from '@/components/utility/amounts/Amount';
import { Currency } from '@/types';
import { TextInput } from 'flowbite-react';

interface InputLud16Props {
   amount: number;
   unit: Currency;
   value: string;
   children: React.ReactNode;
   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputLud16 = ({ amount, unit, value, onChange, children }: InputLud16Props) => {
   return (
      <>
         <div className='w-full '>
            <span className='text-xl text-black flex flex-row items-center gap-3'>
               Sending:
               <Amount
                  unitClassName='text-2xl text-cyan-teal font-bold pt-1'
                  value={amount}
                  unit={unit}
                  className='font-teko text-black text-3xl font-bold'
               />
            </span>
            <TextInput
               placeholder={`Lightning address`}
               value={value}
               onChange={onChange}
               className='w-full'
            />
         </div>
         {children}
      </>
   );
};

export default InputLud16;

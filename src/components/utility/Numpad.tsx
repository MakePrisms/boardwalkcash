import React, { useRef } from 'react';
import { Kbd } from 'flowbite-react';
import { BackspaceIcon } from '@heroicons/react/20/solid';
import { useCashuContext } from '@/hooks/contexts/cashuContext';

interface NumpadProps {
   onNumberClick: (num: string) => void;
   onBackspaceClick: () => void;
}

const Numpad: React.FC<NumpadProps> = ({ onNumberClick, onBackspaceClick }) => {
   const { activeUnit } = useCashuContext();
   const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
   const numpadRef = useRef<HTMLDivElement>(null);

   const showDecimal = activeUnit === 'usd';

   return (
      <div className='flex justify-center w-full' ref={numpadRef}>
         <div className='grid grid-cols-3 gap-2 w-full max-w-sm'>
            {numbers.map(num => (
               <Kbd
                  key={num}
                  onClick={() => onNumberClick?.(num)}
                  className='cursor-pointer hover:bg-gray-100 text-lg py-2 px-6 flex items-center justify-center w-full transition-all active:scale-95 active:bg-gray-200'
               >
                  {num}
               </Kbd>
            ))}
            {showDecimal ? (
               <Kbd
                  onClick={() => onNumberClick?.('.')}
                  className='cursor-pointer hover:bg-gray-100 text-lg py-2 px-6 flex items-center justify-center w-full transition-all active:scale-95 active:bg-gray-200'
               >
                  .
               </Kbd>
            ) : (
               <div></div>
            )}
            <Kbd
               onClick={() => onNumberClick?.('0')}
               className='cursor-pointer hover:bg-gray-100 text-lg py-2 px-6 flex items-center justify-center w-full transition-all active:scale-95 active:bg-gray-200'
            >
               0
            </Kbd>
            <button
               onClick={onBackspaceClick}
               className='cursor-pointer  text-lg py-2 px-6 flex items-center justify-center w-full text-black transition-all active:scale-95 active:bg-gray-200 rounded-md'
            >
               <BackspaceIcon className='h-6 w-6' />
            </button>
         </div>
      </div>
   );
};

export default Numpad;

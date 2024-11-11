import React from 'react';
import { Kbd } from 'flowbite-react';
import { BackspaceIcon } from '@heroicons/react/20/solid';

interface NumpadProps {
   onNumberClick: (num: string) => void;
   onBackspaceClick: () => void;
   showDecimal: boolean;
}

const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const Numpad = ({ onNumberClick, onBackspaceClick, showDecimal }: NumpadProps) => {
   return (
      <div className='flex justify-center w-full'>
         <div className='grid grid-cols-3 gap-2 w-full max-w-sm'>
            {numbers.map(num => (
               <Kbd
                  key={num}
                  onClick={() => onNumberClick(num)}
                  className='cursor-pointer hover:bg-gray-100 text-lg py-2 px-6 flex items-center justify-center w-full transition-all active:scale-95 active:bg-gray-200'
               >
                  {num}
               </Kbd>
            ))}
            {showDecimal ? (
               <Kbd
                  onClick={() => onNumberClick('.')}
                  className='cursor-pointer hover:bg-gray-100 text-lg py-2 px-6 flex items-center justify-center w-full transition-all active:scale-95 active:bg-gray-200'
               >
                  .
               </Kbd>
            ) : (
               <div></div>
            )}
            <Kbd
               onClick={() => onNumberClick('0')}
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

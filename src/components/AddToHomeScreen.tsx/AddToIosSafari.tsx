import React from 'react';

import { TbShare2 } from 'react-icons/tb';
import { AiOutlinePlusSquare } from 'react-icons/ai';
import { FaTimes } from 'react-icons/fa';
import { ImArrowDown } from 'react-icons/im';

interface Props {
   closePrompt: () => void;
   doNotShowAgain: () => void;
}

export default function AddToIosSafari(props: Props) {
   const { closePrompt, doNotShowAgain } = props;

   return (
      <div className='fixed bottom-0 left-0 right-0 h-[60%] z-50 pb-12 px-4 text-white'>
         <div className='relative bg-primary p-4 h-full rounded-xl flex flex-col justify-around items-center text-center'>
            <button className='absolute top-0 right-0 p-3' onClick={closePrompt}>
               <FaTimes className='text-2xl' />
            </button>
            <p className='text-lg'>
               For the best experience, we recommend installing the Valley Trader app to your home
               screen!
            </p>
            <div className='flex gap-2 items-center text-lg'>
               <p>Click the</p>
               <TbShare2 className='text-4xl' />
               <p>icon</p>
            </div>
            <div className='flex flex-col gap-2 items-center text-lg w-full px-4'>
               <p>Scroll down and then click:</p>
               <div className='bg-zinc-800 flex justify-between items-center w-full px-4 py-2 rounded-lg'>
                  <p>Add to Home Screen</p>
                  <AiOutlinePlusSquare className='text-2xl' />
               </div>
            </div>
            <button className='border-2 p-1' onClick={doNotShowAgain}>
               Don&apos;t show again
            </button>
            <ImArrowDown className='text-4xl absolute -bottom-[50px] text-indigo-700 -z-10 animate-bounce' />
         </div>
      </div>
   );
}

import React from 'react';

import { FaBars } from 'react-icons/fa';
import { FiShare } from 'react-icons/fi';
import { AiOutlinePlusSquare } from 'react-icons/ai';

import { Button } from 'flowbite-react';

interface Props {
   doNotShowAgain: () => void;
}

export default function AddToMobileFirefoxIos(props: Props) {
   const { doNotShowAgain } = props;

   return (
      <>
         <div>
            <div className='flex gap-3 items-center justify-center mb-4'>
               <p>Click the</p>
               <FaBars className='text-2xl' />
               <p>icon</p>
            </div>
            <div className='flex flex-col gap-2 items-center w-full px-4 mb-4'>
               <p>Scroll down and then click:</p>
               <div className='flex justify-center items-center w-full px-6 py-3 rounded-lg'>
                  <p>&quot;Share&quot;</p>
                  <FiShare className='ml-2 text-xl' />
               </div>
            </div>
            <div className='flex flex-col gap-2 items-center w-full px-4 mb-4'>
               <p>Then click:</p>
               <div className='flex justify-center items-center w-full px-6 py-3 rounded-lg'>
                  <p>&quot;Add to Home Screen&quot;</p>
                  <AiOutlinePlusSquare className='ml-2 text-xl' />
               </div>
            </div>
         </div>
         <Button className='btn-primary w-full' onClick={doNotShowAgain}>
            Don&apos;t show again
         </Button>
      </>
   );
}

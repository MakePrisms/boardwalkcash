import React from 'react';

import { FaBars } from 'react-icons/fa';
import { TfiPlus } from 'react-icons/tfi';

import { Button } from 'flowbite-react';

interface Props {
   doNotShowAgain: () => void;
}

export default function AddToSamsung(props: Props) {
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
                  <TfiPlus className='mr-2 text-xl' />
                  <p>&quot;Add page to&quot;</p>
               </div>
            </div>
            <div className='flex flex-col gap-2 items-center w-full px-4 mb-4'>
               <p>Then select:</p>
               <div className='flex justify-center items-center w-full px-6 py-3 rounded-lg'>
                  <p>&quot;Home screen&quot;</p>
               </div>
            </div>
         </div>
         <Button className='btn-primary w-full' onClick={doNotShowAgain}>
            Don&apos;t show again
         </Button>
      </>
   );
}

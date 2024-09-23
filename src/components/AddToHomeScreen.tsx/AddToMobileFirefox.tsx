import React from 'react';

import { HiDotsVertical } from 'react-icons/hi';

import { Button } from 'flowbite-react';

interface Props {
   doNotShowAgain: () => void;
}

export default function AddToMobileFirefox(props: Props) {
   const { doNotShowAgain } = props;

   return (
      <>
         <div>
            <div className='flex gap-3 items-center justify-center mb-4'>
               <p>Click the</p>
               <HiDotsVertical className='text-2xl' />
               <p>icon</p>
            </div>
            <div className='flex flex-col gap-2 items-center w-full px-4 mb-4'>
               <p>Scroll down and then click:</p>
               <div className='flex justify-center items-center w-full px-6 py-3 rounded-lg'>
                  <p>&quot;Install&quot;</p>
               </div>
            </div>
         </div>
         <Button className='btn-primary w-full' onClick={doNotShowAgain}>
            Don&apos;t show again
         </Button>
      </>
   );
}

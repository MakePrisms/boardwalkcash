import React from 'react';

import { TbShare2 } from 'react-icons/tb';
import { AiOutlinePlusSquare } from 'react-icons/ai';

import { Button } from 'flowbite-react';

interface Props {
   doNotShowAgain: () => void;
}

export default function AddToIosSafari(props: Props) {
   const { doNotShowAgain } = props;

   return (
      <>
         <div>
            <div className='flex gap-3 items-center justify-center mb-4'>
               <p>Click the</p>
               <TbShare2 className='text-2xl' />
               <p>icon</p>
            </div>
            <div className='flex flex-col gap-2 items-center w-full px-4 mb-4'>
               <p>Scroll down and then click:</p>
               <div className='flex justify-center items-center w-full px-6 py-3 rounded-lg'>
                  <p>&quot;Add to Home Screen&quot;</p>
               </div>
            </div>
         </div>
         <Button className='btn-primary w-full' onClick={doNotShowAgain}>
            Don&apos;t show again
         </Button>
      </>
   );
}

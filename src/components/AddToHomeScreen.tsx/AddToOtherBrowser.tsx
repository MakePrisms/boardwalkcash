import React from 'react';
import Link from 'next/link';

import { TbSearch } from 'react-icons/tb';

import { Button } from 'flowbite-react';

interface Props {
   doNotShowAgain: () => void;
}

export default function AddToOtherBrowser(props: Props) {
   const { doNotShowAgain } = props;
   const searchUrl = `https://www.google.com/search?q=add+to+home+screen+for+common-mobile-browsers`;

   return (
      <>
         <div>
            <div className='flex gap-3 items-center justify-center mb-4'>
               <p>Click the</p>
               <TbSearch className='text-2xl' />
               <p>icon</p>
            </div>
            <div className='flex flex-col gap-2 items-center w-full px-4 mb-4'>
               <p>Search for:</p>
               <div className='flex justify-center items-center w-full px-6 py-3 rounded-lg'>
                  <p>&quot;Add to Home Screen for [Your Browser]&quot;</p>
               </div>
            </div>
            <div className='flex justify-center mb-4'>
               <Link className='text-blue-300' href={searchUrl} target='_blank'>
                  Try This Search
               </Link>
            </div>
         </div>
         <Button className='btn-primary w-full' onClick={doNotShowAgain}>
            Don&apos;t show again
         </Button>
      </>
   );
}

import React, { useState } from 'react';
import { Button } from 'flowbite-react';
import { ArrowUpRightIcon } from '@heroicons/react/20/solid';
import { SendModal } from '@/components/modals/SendModal';

const Send = () => {
   const [isSendModalOpen, setIsSendModalOpen] = useState(false);

   return (
      <>
         <Button onClick={() => setIsSendModalOpen(true)} className='btn-primary'>
            <span className='text-lg'>&nbsp;&nbsp;Send&nbsp;</span>
            <ArrowUpRightIcon className='ms-2 h-5 w-5 mt-1' />
         </Button>
         <SendModal isOpen={isSendModalOpen} onClose={() => setIsSendModalOpen(false)} />
      </>
   );
};

export default Send;

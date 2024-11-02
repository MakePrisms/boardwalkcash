import ViewDrawerOrModal from '@/components/utility/ViewDrawerOrModal';
import { ArrowUpRightIcon } from '@heroicons/react/20/solid';
import SendButtonContent from './SendButtonContent';
import { Button } from 'flowbite-react';
import { useState } from 'react';

const SendButton = ({ isMobile }: { isMobile: boolean }) => {
   const [showButtonContent, setShowButtonContent] = useState(false);

   return (
      <>
         <Button onClick={() => setShowButtonContent(true)} className='btn-primary'>
            <span className='text-lg'>&nbsp;&nbsp;Send&nbsp;</span>
            <ArrowUpRightIcon className='ms-2 h-5 w-5 mt-1' />
         </Button>
         <ViewDrawerOrModal
            isMobile={isMobile}
            isOpen={showButtonContent}
            onClose={() => setShowButtonContent(false)}
            title='Send'
         >
            <SendButtonContent
               isMobile={isMobile}
               closeParentComponent={() => setShowButtonContent(false)}
            />
         </ViewDrawerOrModal>
      </>
   );
};

export default SendButton;

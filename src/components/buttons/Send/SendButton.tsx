import ViewDrawerOrModal from '@/components/utility/ViewDrawerOrModal';
import { ArrowUpRightIcon } from '@heroicons/react/20/solid';
import SendFlow from './SendFlow';
import { Button } from 'flowbite-react';
import { useState } from 'react';

const SendButton = ({ isMobile }: { isMobile: boolean }) => {
   const [showSendFlow, setShowSendFlow] = useState(false);

   return (
      <>
         <Button onClick={() => setShowSendFlow(true)} className='btn-primary'>
            <span className='text-lg'>&nbsp;&nbsp;Send&nbsp;</span>
            <ArrowUpRightIcon className='ms-2 h-5 w-5 mt-1' />
         </Button>
         <ViewDrawerOrModal
            isMobile={isMobile}
            isOpen={showSendFlow}
            onClose={() => setShowSendFlow(false)}
            title='Send'
         >
            <SendFlow isMobile={isMobile} closeParentComponent={() => setShowSendFlow(false)} />
         </ViewDrawerOrModal>
      </>
   );
};

export default SendButton;

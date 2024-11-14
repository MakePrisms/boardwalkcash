import ViewDrawerOrModal from '@/components/utility/ViewDrawerOrModal';
import { ArrowUpRightIcon } from '@heroicons/react/20/solid';
import SendFlow from './SendFlow';
import { Button } from 'flowbite-react';
import { useState } from 'react';

const SendButton = () => {
   const [showSendFlow, setShowSendFlow] = useState(false);

   return (
      <div>
         <Button onClick={() => setShowSendFlow(true)} className='btn-primary'>
            <span className='text-lg'>&nbsp;&nbsp;Send&nbsp;</span>
            <ArrowUpRightIcon className='ms-2 h-5 w-5 mt-1' />
         </Button>
         <ViewDrawerOrModal
            isOpen={showSendFlow}
            onClose={() => setShowSendFlow(false)}
            title='Send'
         >
            <SendFlow onClose={() => setShowSendFlow(false)} />
         </ViewDrawerOrModal>
      </div>
   );
};

export default SendButton;

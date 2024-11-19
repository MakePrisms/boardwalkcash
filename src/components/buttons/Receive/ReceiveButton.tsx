import { ArrowDownRightIcon } from '@heroicons/react/20/solid';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import ReceiveFlow from './ReceiveFlow';
import { Button } from 'flowbite-react';
import React, { useState } from 'react';
import ViewDrawerOrModal from '@/components/utility/ViewDrawerOrModal';

const ReceiveButton = () => {
   const [showReceiveFlow, setShowReceiveFlow] = useState(false);
   const { activeUnit } = useCashuContext();

   const handleModalClose = () => {
      setShowReceiveFlow(false);
   };

   return (
      <div>
         <Button onClick={() => setShowReceiveFlow(true)} className='btn-primary'>
            <span className='text-lg'>Receive</span>{' '}
            <ArrowDownRightIcon className='ms-2 h-5 w-5 mt-1' />
         </Button>
         <ViewDrawerOrModal
            isOpen={showReceiveFlow}
            onClose={handleModalClose}
            title={activeUnit === 'usd' ? 'Receive $' : 'Receive Bitcoin'}
         >
            <ReceiveFlow onClose={handleModalClose} />
         </ViewDrawerOrModal>
      </div>
   );
};

export default ReceiveButton;

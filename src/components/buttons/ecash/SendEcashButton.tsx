import SendEcashModal from '@/components/modals/SendEcashModal';
import { Button } from 'flowbite-react';
import { useState } from 'react';

interface SendEcashButtonProps {
   onClick?: () => void;
}

const SendEcashButton = ({ onClick }: SendEcashButtonProps) => {
   const [showSendEcashModal, setShowSendEcashModal] = useState(false);

   const handleSendEcash = () => {
      console.log('Send Ecash');
      onClick && onClick();
   };

   return (
      <>
         <Button onClick={() => setShowSendEcashModal(true)}>Send Ecash</Button>
         <SendEcashModal
            showModal={showSendEcashModal}
            closeModal={() => setShowSendEcashModal(false)}
         />
      </>
   );
};

export default SendEcashButton;

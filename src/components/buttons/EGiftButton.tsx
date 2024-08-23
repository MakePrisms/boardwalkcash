import { PublicContact } from '@/types';
import { Button, ButtonProps } from 'flowbite-react';
import { useState } from 'react';
import GiftModal from '../eGifts/GiftModal';

interface EGiftButtonProps extends ButtonProps {
   contact: PublicContact;
}

const EGiftButton = ({ contact, ...ButtonProps }: EGiftButtonProps) => {
   const [showEGiftModal, setShowEGiftModal] = useState(false);
   return (
      <>
         <Button
            {...ButtonProps}
            className={`etip-button ${ButtonProps.className}`}
            onClick={() => setShowEGiftModal(true)}
         >
            eGift
         </Button>
         <GiftModal
            contact={contact}
            isOpen={showEGiftModal}
            onClose={() => setShowEGiftModal(false)}
            useInvoice={true}
         />
      </>
   );
};

export default EGiftButton;

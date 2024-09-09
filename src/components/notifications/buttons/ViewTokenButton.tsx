import { Token } from '@cashu/cashu-ts';
import ConfirmEcashReceiveModal from '@/components/modals/ConfirmEcashReceiveModal';
import { useState } from 'react';
import { PublicContact } from '@/types';

interface ViewTokenButtonProps {
   token: Token;
   contact?: PublicContact;
   clearNotification: () => void;
}

export const ViewTokenButton = ({ token, clearNotification, contact }: ViewTokenButtonProps) => {
   const [isModalOpen, setIsModalOpen] = useState(false);

   const onSuccess = () => {
      clearNotification();
   };

   const onClose = () => {
      setIsModalOpen(false);
   };

   return (
      <>
         <button className='btn-notification' onClick={() => setIsModalOpen(true)}>
            view
         </button>
         <ConfirmEcashReceiveModal
            token={token}
            isOpen={isModalOpen}
            onClose={onClose}
            onSuccess={onSuccess}
            contact={contact}
            isUserInitialized={true}
         />
      </>
   );
};

export default ViewTokenButton;

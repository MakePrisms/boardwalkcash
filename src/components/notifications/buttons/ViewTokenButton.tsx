import { Token } from '@cashu/cashu-ts';
import ConfirmEcashReceiveModal from '../../modals/ConfirmEcashReceiveModal';
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

   return (
      <>
         <button className='btn-notification' onClick={() => setIsModalOpen(true)}>
            view
         </button>
         <ConfirmEcashReceiveModal
            token={token}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={onSuccess}
            contact={contact}
         />
      </>
   );
};

export default ViewTokenButton;

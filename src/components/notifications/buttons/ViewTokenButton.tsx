import { Token } from '@cashu/cashu-ts';
import ConfirmEcashReceiveModal from '../../modals/ConfirmEcashReceiveModal';
import { useState } from 'react';

interface ViewTokenButtonProps {
   token: Token;
   clearNotification: () => void;
}

export const ViewTokenButton = ({ token, clearNotification }: ViewTokenButtonProps) => {
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
         />
      </>
   );
};

export default ViewTokenButton;

import ViewMintlessTransactionModal from '@/components/modals/ViewMintlessTransactionModal';
import { useState } from 'react';

const ViewMintlessTransactionButton = ({
   contact,
   amountUsdCents,
   giftName,
}: {
   contact: any;
   amountUsdCents: number;
   giftName: string | null;
}) => {
   const [isModalOpen, setIsModalOpen] = useState(false);
   return (
      <>
         <button className='btn-notification' onClick={() => setIsModalOpen(true)}>
            view
         </button>
         <ViewMintlessTransactionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            amountUsdCents={amountUsdCents}
            contact={contact}
            giftName={giftName}
         />
      </>
   );
};

export default ViewMintlessTransactionButton;

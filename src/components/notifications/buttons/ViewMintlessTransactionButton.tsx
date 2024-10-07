import ViewMintlessTransactionModal from '@/components/modals/ViewMintlessTransactionModal';
import { Currency, PublicContact } from '@/types';
import { useState } from 'react';

const ViewMintlessTransactionButton = ({
   contact,
   giftName,
   amountUnit,
   unit,
}: {
   contact?: PublicContact;
   amountUnit: number;
   unit: Currency;
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
            amountUnit={amountUnit}
            unit={unit}
            contact={contact}
            giftName={giftName}
         />
      </>
   );
};

export default ViewMintlessTransactionButton;

import ViewMintlessTransactionModal from '@/components/modals/ViewMintlessTransactionModal';
import { Currency, GiftAsset, PublicContact } from '@/types';
import { useState } from 'react';

const ViewMintlessTransactionButton = ({
   contact,
   gift,
   amountUnit,
   unit,
}: {
   contact?: PublicContact;
   amountUnit: number;
   unit: Currency;
   gift: GiftAsset | null;
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
            gift={gift}
         />
      </>
   );
};

export default ViewMintlessTransactionButton;

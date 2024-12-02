import { Currency, GiftAsset, PublicContact } from '@/types';
import { ViewGiftModalBody } from '../eGifts/ViewGiftModal';
import { WalletIcon } from '@heroicons/react/20/solid';
import { formatUnit } from '@/utils/formatting';
import { Modal } from 'flowbite-react';
import { useMemo } from 'react';

interface ViewMintlessTransactionModalProps {
   isOpen: boolean;
   onClose: () => void;
   amountUnit: number;
   unit: Currency;
   contact?: PublicContact;
   gift: GiftAsset | null;
}

const ViewMintlessTransactionModal = ({
   isOpen,
   onClose,
   amountUnit,
   unit,
   contact,
   gift,
}: ViewMintlessTransactionModalProps) => {
   const title = useMemo(() => {
      const thing = gift ? 'eGift' : 'eTip';
      return `${thing} ${contact?.username ? `from ${contact.username}` : ''}`;
   }, [contact?.username, gift]);

   return (
      <Modal show={isOpen} onClose={onClose}>
         <Modal.Header>{title}</Modal.Header>
         <Modal.Body className='text-black flex flex-col justify-center items-center gap-6'>
            {gift !== null && (
               <ViewGiftModalBody amountCents={amountUnit} stickerPath={gift?.selectedSrc!} />
            )}
            {gift === null && (
               <h3 className='text-5xl text-center'>{formatUnit(amountUnit, unit)}</h3>
            )}
            <div className='flex justify-center mt-4'>
               Claimed to wallet <WalletIcon className='w-5 h-5 ml-3' />
            </div>
         </Modal.Body>
      </Modal>
   );
};

export default ViewMintlessTransactionModal;

import { PublicContact } from '@/types';
import { formatCents } from '@/utils/formatting';
import { Modal } from 'flowbite-react';
import StickerItem from './stickers/StickerItem';
import ClipboardButton from '../buttons/utility/ClipboardButton';

interface ViewGiftModalProps {
   isOpen: boolean;
   onClose: () => void;
   amountCents: number;
   stickerPath: string;
   selectedContact: PublicContact | null;
   txid: string;
}

interface ViewGiftModalBodyProps {
   amountCents: number;
   stickerPath: string;
   txid?: string;
}

export const ViewGiftModalBody = ({ amountCents, stickerPath, txid }: ViewGiftModalBodyProps) => {
   return (
      <Modal.Body>
         <div className='flex flex-col justify-center items-center text-black text-4xl '>
            <StickerItem
               selectedSrc={stickerPath}
               unselectedSrc={stickerPath}
               isSelected={false}
               alt={formatCents(amountCents)}
               size='lg'
            />
            {txid && (
               <ClipboardButton
                  toCopy={`${process.env.NEXT_PUBLIC_PROJECT_URL}/wallet?txid=${txid}`}
                  toShow={'Share'}
                  className='btn-primary mt-6'
               />
            )}
         </div>
      </Modal.Body>
   );
};

export const ViewGiftModal = ({
   isOpen,
   onClose,
   amountCents,
   stickerPath,
   selectedContact,
   txid,
}: ViewGiftModalProps) => {
   return (
      <Modal show={isOpen} onClose={() => onClose()}>
         <Modal.Header>
            <h2>
               eGift for{' '}
               <a className='underline' target='_blank' href={`/${selectedContact?.username}`}>
                  {selectedContact?.username}
               </a>
            </h2>
         </Modal.Header>
         <ViewGiftModalBody amountCents={amountCents} stickerPath={stickerPath} txid={txid} />
      </Modal>
   );
};

export default ViewGiftModal;

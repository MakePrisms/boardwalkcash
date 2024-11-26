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
   token?: string;
}

interface ViewGiftModalBodyProps {
   amountCents: number;
   stickerPath: string;
   txid?: string;
   token?: string;
}

export const ViewGiftModalBody = ({
   amountCents,
   stickerPath,
   txid,
   token,
}: ViewGiftModalBodyProps) => {
   const base = `${window.location.origin}/wallet?`;
   const toCopy = token ? base + `token=${token}` : base + `txid=${txid}`;

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
                  toCopy={toCopy}
                  toShow={'Share'}
                  className='btn-primary hover:!bg-[var(--btn-primary-bg)] mt-6'
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
   token,
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
         <ViewGiftModalBody
            amountCents={amountCents}
            stickerPath={stickerPath}
            txid={txid}
            token={token}
         />
      </Modal>
   );
};

export default ViewGiftModal;

import { Button, Modal } from 'flowbite-react';
import { useMemo, useState } from 'react';
import { PublicContact, GiftAsset } from '@/types';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import { useCashu } from '@/hooks/cashu/useCashu';
import { postTokenToDb } from '@/utils/appApiRequests';
import { computeTxId } from '@/utils/cashu';
import useNotifications from '@/hooks/boardwalk/useNotifications';
import { ViewGiftModalBody } from './ViewGiftModal';
import ContactsModal from '../modals/ContactsModal/ContactsModal';
import ViewContactsModalBody from '../modals/ContactsModal/ViewContactsModalBody';
import { useToast } from '@/hooks/util/useToast';
import Stickers from './stickers/Stickers';

interface GiftModalProps {
   isOpen: boolean;
   onClose: () => void;
}

enum GiftStep {
   SelectContact,
   SelectGift,
   ConfirmGift,
   ShareGift,
}

const GiftModal = ({ isOpen, onClose }: GiftModalProps) => {
   const [currentStep, setCurrentStep] = useState<GiftStep>(GiftStep.SelectContact);
   const [selectedContact, setSelectedContact] = useState<PublicContact | null>(null);
   const [amountCents, setAmountCents] = useState<number | null>(null);
   const [stickerPath, setStickerPath] = useState<string | null>(null);
   const [gift, setGift] = useState<string | undefined>(undefined);
   const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
   const [token, setToken] = useState<string | null>(null);
   const { createSendableToken } = useCashu();
   const { sendTokenAsNotification } = useNotifications();
   const [sending, setSending] = useState(false);
   const { addToast } = useToast();

   const handleClose = () => {
      onClose();
      setCurrentStep(GiftStep.SelectContact);
      setToken(null);
      setSelectedContact(null);
      setAmountCents(null);
      setStickerPath(null);
   };

   const handleGiftSelected = (gift: GiftAsset) => {
      setAmountCents(gift.amountCents);
      setStickerPath(gift.selectedSrc);
      setGift(gift.name);
   };

   const handleContactSelected = (contact: PublicContact) => {
      setSelectedContact(contact);
      setCurrentStep(GiftStep.SelectGift);
   };

   const onSendGift = async () => {
      if (!amountCents || !stickerPath) {
         throw new Error('Oops, didnt select a gift');
      }
      setSending(true);
      const sendableToken = await createSendableToken(amountCents, {
         pubkey: `02${selectedContact?.pubkey}`,
         gift: gift,
      });

      if (!sendableToken) {
         /* this error case is handled in useCashu */
         return;
      }

      const txid = await postTokenToDb(sendableToken, gift);
      // TODO: won't work if tokes are not locked
      await sendTokenAsNotification(sendableToken, txid);
      setToken(sendableToken);

      setCurrentStep(GiftStep.ShareGift);

      setSending(false);
      addToast('eGift sent', 'success');
   };

   const renderContent = () => {
      switch (currentStep) {
         case GiftStep.SelectContact:
            return <ViewContactsModalBody mode='select' onSelectContact={handleContactSelected} />;
         case GiftStep.SelectGift:
            return (
               <div className='flex flex-col w-full items-center justify-center text-black'>
                  <Stickers onSelectGift={handleGiftSelected} />
                  <div className='w-full flex justify-end mt-8'>
                     <Button
                        key='gift-continue'
                        className='btn-primary sm:mr-4 mr-2'
                        onClick={() => setCurrentStep(GiftStep.ConfirmGift)}
                     >
                        Continue
                     </Button>
                  </div>
               </div>
            );
         case GiftStep.ConfirmGift:
            if (!amountCents || !stickerPath) {
               throw new Error('Oops, didnt select a gift');
            }
            return (
               <div className='flex flex-col w-full text-black mt-[-22px]'>
                  <ViewGiftModalBody
                     amountCents={amountCents}
                     stickerPath={stickerPath}
                     selectedContact={selectedContact}
                  />
                  <div className='w-full flex justify-center'>
                     <div className='w-32 h-10'>
                        {!token && (
                           <Button
                              key='gift-send'
                              className='btn-primary w-full h-full'
                              onClick={onSendGift}
                              isProcessing={sending}
                              id='send-button'
                           >
                              Send
                           </Button>
                        )}
                     </div>
                  </div>
               </div>
            );
         case GiftStep.ShareGift:
            if (!amountCents || !stickerPath) {
               throw new Error('Oops, didnt select a gift');
            }
            return (
               <div className='flex flex-col w-full text-black mt-[-22px]'>
                  <ViewGiftModalBody
                     amountCents={amountCents}
                     stickerPath={stickerPath}
                     selectedContact={selectedContact}
                  />
                  <div className='w-full flex justify-center'>
                     <div className='w-32 h-10'>
                        {token && (
                           <ClipboardButton
                              toCopy={`${process.env.NEXT_PUBLIC_PROJECT_URL}/wallet?txid=${computeTxId(token)}`}
                              toShow={'Share'}
                              className='btn-primary w-full h-full'
                              key={`gift-share`}
                              btnId='share-button'
                           />
                        )}
                     </div>
                  </div>
               </div>
            );
      }
   };

   const title = useMemo(() => {
      switch (currentStep) {
         case GiftStep.SelectContact:
            return 'Select a contact';
         case GiftStep.SelectGift:
            return 'Select an eGift';
         case GiftStep.ConfirmGift:
            return `eGift for ${selectedContact?.username}`;
         case GiftStep.ShareGift:
            return `eGift for ${selectedContact?.username}`;
      }
   }, [currentStep, selectedContact]);

   return (
      <>
         <Modal show={isOpen} onClose={handleClose}>
            <Modal.Header>
               <h2>{title}</h2>
            </Modal.Header>
            <Modal.Body>{renderContent()}</Modal.Body>
         </Modal>
         <ContactsModal
            mode='select'
            isOpen={isContactsModalOpen}
            onClose={() => setIsContactsModalOpen(false)}
            onSelectContact={handleContactSelected}
         />
      </>
   );
};

export default GiftModal;

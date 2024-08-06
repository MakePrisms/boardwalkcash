import { on } from 'events';
import { Button, Modal } from 'flowbite-react';
import { useMemo, useState } from 'react';
import Stickers from './stickers/Stickers';
import ViewContactsModalBody from '../modals/ContactsModal/ViewContactsModalBody';
import { PublicContact } from '@/types';
import next from 'next';
import ClipboardButton from '../buttons/utility/ClipboardButton';

interface GiftModalProps {
   isOpen: boolean;
   onClose: () => void;
}

const GiftModal = ({ isOpen, onClose }: GiftModalProps) => {
   const [currentStep, setCurrentStep] = useState(0);
   const [selectedGift, setSelectedGift] = useState<string | null>(null);
   const [selectedContact, setSelectedContact] = useState<PublicContact | null>(null);

   const nextStep = () => {
      setCurrentStep((currentStep + 1) % 3);
   };

   const handleClose = () => {
      onClose();
      setCurrentStep(0);
   };

   const handleGiftSelected = (gift: string) => {
      // nextStep();
      setSelectedGift(gift);
   };

   const handleContactSelected = (contact: PublicContact) => {
      nextStep();
      setSelectedContact(contact);
   };

   const renderSelectGift = () => {
      return (
         <div className='flex justify-center items-center my-8 text-black'>
            <Stickers
               emojis={[
                  { amount: 10, emoji: '🍦' },
                  { amount: 100, emoji: '🌭' },
                  { amount: 200, emoji: '🦀' },
                  { amount: 1_000, emoji: '🐳' },
               ]}
               onSelectGift={handleGiftSelected}
            />
         </div>
      );
   };

   const renderSelectContact = () => {
      return (
         <ViewContactsModalBody
            mode='select'
            onSelectContact={handleContactSelected}
            onAddContactClicked={() => null}
         />
      );
   };

   const onSendGift = () => {
      console.log('send gift');
   };

   const renderGift = () => {
      return (
         <div className='flex flex-col justify-center items-center my-8 text-black text-4xl'>
            <p>
               Send {selectedGift} to {selectedContact?.username}
            </p>
            <div className='flex justify-center items-center mt-4'>
               <ClipboardButton toCopy={''} toShow={'Link'} />
               <Button color='success' onClick={() => onSendGift()}>
                  Send
               </Button>
            </div>
         </div>
      );
   };

   const renderContent = () => {
      switch (currentStep) {
         case 0:
            return renderSelectGift();
         case 1:
            return renderSelectContact();
         case 2:
            return renderGift();
         default:
            return null;
      }
   };

   const title = useMemo(() => {
      switch (currentStep) {
         case 0:
            return 'Select a gift';
         case 1:
            return 'Select a contact';
         case 2:
            return 'Gift';
         default:
            return null;
      }
   }, [currentStep]);

   return (
      <Modal show={isOpen} onClose={() => handleClose()}>
         <Modal.Header>
            <h2>{title}</h2>
         </Modal.Header>
         <Modal.Body>{renderContent()}</Modal.Body>
         <Modal.Footer>
            <div className='flex justify-between mx-3 w-full'>
               <Button color='failure' onClick={() => setCurrentStep((currentStep - 1) % 3)}>
                  Back
               </Button>
               {currentStep === 1 && (
                  <Button color='warning' onClick={() => setCurrentStep((currentStep + 1) % 3)}>
                     Skip{' '}
                  </Button>
               )}
               <Button color='success' onClick={() => setCurrentStep((currentStep + 1) % 3)}>
                  Continue
               </Button>
            </div>
         </Modal.Footer>
      </Modal>
   );
};

export default GiftModal;

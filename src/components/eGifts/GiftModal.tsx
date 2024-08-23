import { Button, Modal, Tooltip } from 'flowbite-react';
import { useMemo, useState } from 'react';
import { PublicContact, GiftAsset } from '@/types';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import { useCashu } from '@/hooks/cashu/useCashu';
import { getInvoiceForTip, getTipStatus, postTokenToDb } from '@/utils/appApiRequests';
import { computeTxId } from '@/utils/cashu';
import useNotifications from '@/hooks/boardwalk/useNotifications';
import { ViewGiftModalBody } from './ViewGiftModal';
import ContactsModal from '../modals/ContactsModal/ContactsModal';
import ViewContactsModalBody from '../modals/ContactsModal/ViewContactsModalBody';
import { useToast } from '@/hooks/util/useToast';
import Stickers from './stickers/Stickers';
import { WaitForInvoiceModalBody } from '../modals/WaitForInvoiceModal';
import { formatCents } from '@/utils/formatting';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface GiftModalProps {
   isOpen: boolean;
   onClose: () => void;
   contact?: PublicContact;
   useInvoice?: boolean;
}

enum GiftStep {
   SelectContact,
   SelectGift,
   ConfirmGift,
   PayInvoice,
   ShareGift,
}

const GiftModal = ({ isOpen, onClose, contact, useInvoice }: GiftModalProps) => {
   /* skip contact selection if contact is passed in */
   const [currentStep, setCurrentStep] = useState<GiftStep>(
      contact ? GiftStep.SelectGift : GiftStep.SelectContact,
   );
   const [selectedContact, setSelectedContact] = useState<PublicContact | null>(contact || null);
   const [amountCents, setAmountCents] = useState<number | null>(null);
   const [stickerPath, setStickerPath] = useState<string | null>(null);
   const [gift, setGift] = useState<GiftAsset | undefined>(undefined);
   const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
   const [token, setToken] = useState<string | null>(null);
   const { createSendableToken } = useCashu();
   const { sendTokenAsNotification } = useNotifications();
   const [sending, setSending] = useState(false);
   const { addToast } = useToast();
   /* only used when using an invoice, on profile page */
   const [invoice, setInvoice] = useState<string | null>(null);
   const [invoiceTimeout, setInvoiceTimeout] = useState(false);
   const [quoteId, setQuoteId] = useState('');

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
      setGift(gift);
   };

   const handleContactSelected = (contact: PublicContact) => {
      setSelectedContact(contact);
      setCurrentStep(GiftStep.SelectGift);
   };

   const handleLightningTip = async (amountCents: number) => {
      if (!selectedContact) {
         throw new Error('No contact selected');
      }
      try {
         const { checkingId, invoice } = await getInvoiceForTip(
            selectedContact.pubkey,
            amountCents,
            gift?.name,
         );

         setInvoice(invoice);
         setCurrentStep(GiftStep.PayInvoice);

         setQuoteId(checkingId);
         await waitForPayment(checkingId);
      } catch (error) {
         console.error('Error fetching invoice for tip', error);
         addToast('Error fetching invoice for tip', 'error');
      }
   };

   const checkPaymentStatus = async (checkingId?: string): Promise<boolean> => {
      if (!checkingId) {
         checkingId = quoteId;
      }
      try {
         const statusResponse = await getTipStatus(checkingId);
         if (statusResponse.token) {
            setToken(statusResponse.token);
         }
         return statusResponse.paid;
      } catch (error) {
         console.error('Error fetching tip status', error);
         return false;
      }
   };

   const handlePaymentSuccess = () => {
      addToast('Sent eGift!', 'success');
      setCurrentStep(GiftStep.ShareGift);
      setSending(false);
   };

   const waitForPayment = async (checkingId: string) => {
      let attempts = 0;
      const maxAttempts = 4;
      const interval = setInterval(async () => {
         const success = await checkPaymentStatus(checkingId);
         if (success) {
            clearInterval(interval);
            handlePaymentSuccess();
         }
         if (attempts >= maxAttempts) {
            clearInterval(interval);
            setInvoiceTimeout(true);
            return;
         } else {
            attempts++;
         }
         console.log('looking up payment for ', checkingId + '...');
      }, 5000);
   };

   const handleCheckAgain = async () => {
      setInvoiceTimeout(false);
      const paid = await checkPaymentStatus();
      if (paid) {
         handlePaymentSuccess();
      } else {
         setInvoiceTimeout(true);
      }
   };

   const onSendGift = async () => {
      if (!amountCents || !stickerPath) {
         throw new Error('Oops, didnt select a gift');
      }
      setSending(true);
      if (useInvoice) {
         handleLightningTip(amountCents);
         return;
      }
      const sendableToken = await createSendableToken(amountCents, {
         pubkey: `02${selectedContact?.pubkey}`,
         gift: gift?.name,
      });

      if (!sendableToken) {
         /* this error case is handled in useCashu */
         return;
      }

      const txid = await postTokenToDb(sendableToken, gift?.name);
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
                  <ViewGiftModalBody amountCents={amountCents} stickerPath={stickerPath} />
                  {gift?.cost && (
                     <div className='flex justify-center mt-[-22px] mb-2'>
                        <p className='text-sm text-red-600 flex items-center'>
                           {`Cost: ${formatCents(gift.cost)}`}
                           <span className='ml-2'>
                              <Tooltip
                                 trigger='click'
                                 content='50% of the cost is paid to OpenSats'
                              >
                                 <QuestionMarkCircleIcon className='h-4 w-4 text-gray-500' />
                              </Tooltip>
                           </span>
                        </p>
                     </div>
                  )}
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
         case GiftStep.PayInvoice:
            if (!selectedContact) {
               throw new Error('No contact selected');
            }
            if (!invoice) {
               throw new Error('No invoice found');
            }
            return (
               <WaitForInvoiceModalBody
                  invoice={invoice}
                  amountUsdCents={amountCents!}
                  invoiceTimeout={invoiceTimeout}
                  onCheckAgain={handleCheckAgain}
               />
            );
         case GiftStep.ShareGift:
            if (!amountCents || !stickerPath) {
               throw new Error('Oops, didnt select a gift');
            }
            return (
               <div className='flex flex-col w-full text-black mt-[-22px]'>
                  <ViewGiftModalBody amountCents={amountCents} stickerPath={stickerPath} />
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
         case GiftStep.PayInvoice:
            return `eTip for ${selectedContact?.username}`;
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

import { Button, Modal } from 'flowbite-react';
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
import { LockOpenIcon, LockClosedIcon } from '@heroicons/react/20/solid';
import Tooltip from '../Toolttip';

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

   const handleSelectGift = () => {
      if (!gift) {
         alert('Please select a gift');
         return;
      }
      setCurrentStep(GiftStep.ConfirmGift);
   };

   const handleContactSelected = (contact: PublicContact) => {
      setSelectedContact(contact);
      setCurrentStep(GiftStep.SelectGift);
   };

   const handleLightningTip = async (amountCents: number, feeCents?: number) => {
      if (!selectedContact) {
         throw new Error('No contact selected');
      }
      try {
         const { checkingId, invoice } = await getInvoiceForTip(
            selectedContact.pubkey,
            amountCents + (feeCents || 0),
            gift?.name,
            feeCents,
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
         handleLightningTip(amountCents, gift?.cost);
         return;
      }
      const sendableToken = await createSendableToken(amountCents, {
         pubkey: `02${selectedContact?.pubkey}`,
         gift: gift?.name,
         feeCents: gift?.cost,
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
      addToast(`eGift sent (${formatCents(amountCents + (gift?.cost || 0))})`, 'success');
   };

   const renderContent = () => {
      switch (currentStep) {
         case GiftStep.SelectContact:
            return (
               <>
                  <Modal.Body>
                     <ViewContactsModalBody mode='select' onSelectContact={handleContactSelected} />
                  </Modal.Body>
               </>
            );
         case GiftStep.SelectGift:
            return (
               <>
                  <Modal.Body>
                     <div className='flex flex-col w-full h-full relative text-black'>
                        <div className='flex-grow overflow-y-auto'>
                           <Stickers onSelectGift={handleGiftSelected} />
                        </div>
                     </div>
                  </Modal.Body>
                  <Modal.Footer>
                     <div className='w-full flex justify-end'>
                        <Button
                           key='gift-continue'
                           className='btn-primary'
                           onClick={handleSelectGift}
                        >
                           Continue
                        </Button>
                     </div>
                  </Modal.Footer>
               </>
            );
         case GiftStep.ConfirmGift:
            if (!amountCents || !stickerPath) {
               throw new Error('Oops, didnt select a gift');
            }
            return (
               <>
                  <Modal.Body>
                     <div className='flex flex-col w-full text-black'>
                        <ViewGiftModalBody amountCents={amountCents} stickerPath={stickerPath} />
                        {gift?.cost && (
                           <div className='flex justify-center mb-2'>
                              <p className='text-xs flex items-center text-gray-500'>
                                 <span className='flex items-center'>
                                    <Tooltip
                                       position='top'
                                       content='50% of the cost is paid to OpenSats'
                                    >
                                       <div className='flex items-center justify-center w-4 h-4'>
                                          <LockClosedIcon className='h-3 w-3 text-gray-500' />
                                       </div>
                                    </Tooltip>
                                    {`${formatCents(gift.cost, false)}`}
                                 </span>
                              </p>
                           </div>
                        )}
                        {!token && (
                           <div className='w-full flex justify-center mt-4'>
                              <div className='w-32 h-10'>
                                 <Button
                                    key='gift-send'
                                    className='btn-primary w-full h-full'
                                    onClick={onSendGift}
                                    isProcessing={sending}
                                    id='send-button'
                                 >
                                    Send
                                 </Button>
                              </div>
                           </div>
                        )}
                     </div>
                  </Modal.Body>
               </>
            );
         case GiftStep.PayInvoice:
            if (!selectedContact) {
               throw new Error('No contact selected');
            }
            if (!invoice) {
               throw new Error('No invoice found');
            }
            return (
               <>
                  <Modal.Body>
                     <WaitForInvoiceModalBody
                        invoice={invoice}
                        amountUsdCents={amountCents! + (gift?.cost || 0)}
                        invoiceTimeout={invoiceTimeout}
                        onCheckAgain={handleCheckAgain}
                     />
                  </Modal.Body>
               </>
            );
         case GiftStep.ShareGift:
            if (!amountCents || !stickerPath) {
               throw new Error('Oops, didnt select a gift');
            }
            return (
               <>
                  <Modal.Body>
                     <div className='flex flex-col w-full text-black'>
                        <ViewGiftModalBody amountCents={amountCents} stickerPath={stickerPath} />
                        {gift?.cost && (
                           <div className='flex justify-center mb-2'>
                              <p className='text-xs flex items-center text-gray-500'>
                                 <span className='flex items-center'>
                                    <Tooltip
                                       position='top'
                                       content='50% of the cost is paid to OpenSats'
                                    >
                                       <div className='flex items-center justify-center w-4 h-4'>
                                          <LockOpenIcon className='h-3 w-3 text-gray-500' />
                                       </div>
                                    </Tooltip>
                                 </span>
                              </p>
                           </div>
                        )}
                        {token && (
                           <div className='w-full flex justify-center mt-4'>
                              <div className='w-32 h-10'>
                                 <ClipboardButton
                                    toCopy={`${process.env.NEXT_PUBLIC_PROJECT_URL}/wallet?txid=${computeTxId(token)}`}
                                    toShow={'Share'}
                                    className='btn-primary w-full h-full'
                                    key={`gift-share`}
                                    btnId='share-button'
                                 />
                              </div>
                           </div>
                        )}
                     </div>
                  </Modal.Body>
               </>
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
            {renderContent()}
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

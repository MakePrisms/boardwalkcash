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
import { formatUnit } from '@/utils/formatting';
import { LockOpenIcon, LockClosedIcon } from '@heroicons/react/20/solid';
import Tooltip from '../utility/Toolttip';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import useGifts from '@/hooks/boardwalk/useGifts';
import { useCashuContext } from '@/hooks/contexts/cashuContext';

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
   const [amountUnit, setAmountUnit] = useState<number | null>(null);
   const [stickerPath, setStickerPath] = useState<string | null>(null);
   const [gift, setGift] = useState<GiftAsset | undefined>(undefined);
   const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
   const [token, setToken] = useState<string | null>(null);
   const { createSendableToken } = useCashu();
   const { sendTokenAsNotification } = useNotifications();
   const { createMintlessToken, sendToMintlessUser } = useMintlessMode();
   const user = useSelector((state: RootState) => state.user);
   const [sending, setSending] = useState(false);
   const { addToast } = useToast();
   /* only used when using an invoice, on profile page */
   const [invoice, setInvoice] = useState<string | null>(null);
   const [invoiceTimeout, setInvoiceTimeout] = useState(false);
   const [quoteId, setQuoteId] = useState('');
   const { sendCampaignGift } = useGifts();
   const { activeWallet, activeUnit, nwcIsMain } = useCashuContext();

   const handleClose = () => {
      onClose();
      setCurrentStep(GiftStep.SelectContact);
      setToken(null);
      setSelectedContact(null);
      setAmountUnit(null);
      setStickerPath(null);
      setSending(false);
   };

   const handleGiftSelected = (gift: GiftAsset) => {
      setAmountUnit(gift.amount);
      setStickerPath(gift.selectedSrc);
      setGift(gift);
   };

   const handleSelectGift = () => {
      if (!gift) {
         addToast('Please select a gift', 'error');
         return;
      }
      setCurrentStep(GiftStep.ConfirmGift);
   };

   const handleContactSelected = (contact: PublicContact) => {
      setSelectedContact(contact);
      setCurrentStep(GiftStep.SelectGift);
   };

   const handleLightningTip = async (amountUnit: number, feeCents?: number) => {
      if (!selectedContact) {
         throw new Error('No contact selected');
      }
      try {
         const { checkingId, invoice } = await getInvoiceForTip(
            selectedContact.pubkey,
            amountUnit + (feeCents || 0),
            { gift: gift?.name, fee: feeCents, unit: activeUnit },
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
      if (!amountUnit || !stickerPath) {
         throw new Error('Oops, didnt select a gift');
      }
      setSending(true);
      try {
         if (gift?.campaingId) {
            if (!selectedContact) throw new Error('No contact selected');
            const { token } = await sendCampaignGift(gift, selectedContact?.pubkey).catch(e => {
               const errMsg = e.message || 'Failed to send eGift';
               addToast(errMsg, 'error');
               setSending(false);
               return { token: null };
            });
            if (token) {
               addToast(`eGift sent to ${selectedContact?.username}`, 'success');
               setToken(token);
               setCurrentStep(GiftStep.ShareGift);
            }
            setSending(false);
            return;
         } else if (useInvoice) {
            handleLightningTip(amountUnit, gift?.fee);
            return;
         }
         let sendableToken: string | undefined;
         if (user.sendMode === 'mintless' && !selectedContact?.mintlessReceive) {
            if (!selectedContact) {
               throw new Error('No contact selected');
            }
            console.log('creating mintless token for', selectedContact);
            sendableToken = await createMintlessToken(
               amountUnit,
               activeUnit,
               selectedContact,
               gift?.name,
            );
         } else if (selectedContact?.mintlessReceive) {
            return handleMintlessReceive(amountUnit, selectedContact, gift);
         } else {
            sendableToken = await createSendableToken(amountUnit, {
               pubkey: `02${selectedContact?.pubkey}`,
               gift: gift?.name,
               feeCents: gift?.fee,
            });
         }

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
         addToast(
            `eGift sent (${formatUnit(amountUnit + (gift?.fee || 0), activeUnit)})`,
            'success',
         );
      } catch (error: any) {
         console.error('Error sending token:', error);
         const msg = error.message || 'Failed to send token';
         addToast(msg, 'error');
         setSending(false);
      }
   };

   const handleMintlessReceive = async (
      amountUnit: number,
      contact: PublicContact,
      gift?: GiftAsset,
   ) => {
      if (!contact.lud16) {
         throw new Error('Contact does not have a lightning address');
      }
      const transaction = await sendToMintlessUser(amountUnit, activeUnit, contact, gift?.name);
      addToast(`eGift sent`, 'success');
      handleClose();
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
                           <Stickers onSelectGift={handleGiftSelected} contact={selectedContact} />
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
            if (!amountUnit || !stickerPath) {
               throw new Error('Oops, didnt select a gift');
            }
            return (
               <>
                  <Modal.Body>
                     <div className='flex flex-col w-full text-black'>
                        <ViewGiftModalBody amountCents={amountUnit} stickerPath={stickerPath} />
                        {gift?.fee && (
                           <div className='flex justify-center mb-2'>
                              <p className='text-xs flex items-center text-gray-500'>
                                 <span className='flex items-center'>
                                    <Tooltip
                                       position='top'
                                       content='50% of the fee is paid to OpenSats'
                                    >
                                       <div className='flex items-center justify-center w-4 h-4'>
                                          <LockClosedIcon className='h-3 w-3 text-gray-500' />
                                       </div>
                                    </Tooltip>
                                    {/* {`${formatCents(gift.fee, false)}`} */}
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
                        amount={amountUnit! + (gift?.fee || 0)}
                        unit={'usd'}
                        invoiceTimeout={invoiceTimeout}
                        onCheckAgain={handleCheckAgain}
                     />
                  </Modal.Body>
               </>
            );
         case GiftStep.ShareGift:
            if (!amountUnit || !stickerPath) {
               throw new Error('Oops, didnt select a gift');
            }
            return (
               <>
                  <Modal.Body>
                     <div className='flex flex-col w-full text-black'>
                        <ViewGiftModalBody amountCents={amountUnit} stickerPath={stickerPath} />
                        {gift?.fee && (
                           <div className='flex justify-center mb-2'>
                              <p className='text-xs flex items-center text-gray-500'>
                                 <span className='flex items-center'>
                                    <Tooltip
                                       position='top'
                                       content='50% of the fee is paid to OpenSats'
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
                                    toCopy={`${window.location.origin}/wallet?txid=${computeTxId(token)}`}
                                    toShow={'Share'}
                                    className='btn-primary hover:!bg-[var(--btn-primary-bg)] w-full h-full'
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

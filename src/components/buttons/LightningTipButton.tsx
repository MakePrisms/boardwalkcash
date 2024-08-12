import { Button, Modal, Spinner, TextInput } from 'flowbite-react';
import QRCode from 'qrcode.react';
import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/util/useToast';
import { HttpResponseError, getInvoiceForTip, getTipStatus } from '@/utils/appApiRequests';
import { Validate, useForm } from 'react-hook-form';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { formatCents, formatSats } from '@/utils/formatting';
import SendEcashModalBody from '../modals/SendEcashModalBody';
import { PublicContact } from '@/types';

interface LightningTipButtonProps {
   contact: PublicContact;
   className?: string;
}

interface TipFormData {
   amount: number;
}

type ModalPage = 'amount' | 'loading' | 'invoice';

const LightningTipButton = ({ contact, className }: LightningTipButtonProps) => {
   const [showLightningTipModal, setShowLightningTipModal] = useState(false);
   const [showTokenModal, setShowTokenModal] = useState(false);
   const [currentPage, setCurrentPage] = useState<ModalPage>('amount');
   const [invoiceTimeout, setInvoiceTimeout] = useState(false);
   const [invoice, setInvoice] = useState('');
   const [token, setToken] = useState('');
   const [amountData, setAmountData] = useState<{
      amountUsdCents: number;
      amountSats: number;
   } | null>(null);
   const [quoteId, setQuoteId] = useState('');
   const {
      register,
      handleSubmit,
      formState: { errors },
      reset: resetForm,
   } = useForm<TipFormData>();
   const { addToast } = useToast();
   const { unitToSats } = useExchangeRate();

   const handleModalClose = () => {
      setInvoice('');
      setShowLightningTipModal(false);
      setInvoiceTimeout(false);
      setCurrentPage('amount');
      resetForm();
   };

   const onAmountSubmit = async (data: TipFormData) => {
      setCurrentPage('loading');

      const { amount } = data;

      const amountUsdCents = parseFloat(Number(amount).toFixed(2)) * 100;
      const amountSats = await unitToSats(amountUsdCents, 'usd');

      setAmountData({ amountUsdCents, amountSats });

      console.log('amountUsdCents', amountUsdCents);

      await handleLightningTip(amountUsdCents);
   };

   const handleLightningTip = async (amountCents: number) => {
      try {
         const { checkingId, invoice } = await getInvoiceForTip(contact.pubkey, amountCents);

         setInvoice(invoice);
         setCurrentPage('invoice');

         setQuoteId(checkingId);
         await waitForPayment(checkingId);
      } catch (error) {
         console.error('Error fetching invoice for tip', error);
         handleModalClose();
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
      handleModalClose();
      addToast('Sent!', 'success');
      setShowTokenModal(true);
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

   const validateAmount = (value: number): string | true => {
      // const amount = parseFloat(value);
      if (isNaN(value)) return 'Please enter a valid number';
      if (value <= 0) return 'Amount must be positive';
      if (value > 1000000) return 'Amount must not exceed 1,000,000';
      if (value.toString().split('.')[1]?.length > 2) {
         return 'Amount must not have more than 2 decimal places';
      }
      return true;
   };

   const renderModalContent = () => {
      switch (currentPage) {
         case 'amount':
            return (
               <form className='flex flex-col  space-y-4' onSubmit={handleSubmit(onAmountSubmit)}>
                  <TextInput
                     type='text'
                     inputMode='decimal'
                     placeholder='Amount in USD (eg. 0.21)'
                     {...register('amount', {
                        required: 'Amount is required',
                        min: { value: 0, message: 'Amount must be positive' },
                        validate: validateAmount,
                        valueAsNumber: true,
                     })}
                  />
                  {errors.amount && <span className='text-red-500'>{errors.amount.message}</span>}
                  <Button type='submit' className='btn-primary'>
                     Continue
                  </Button>
               </form>
            );
         case 'loading':
            return (
               <div className='flex flex-col items-center justify-center space-y-3'>
                  <Spinner size='lg' />
                  {/* <p className='text-black'>Getting invoice...</p> */}
               </div>
            );
         case 'invoice':
            return (
               <div className='flex flex-col items-center justify-center space-y-4'>
                  <p className='text-black'>Scan with any Bitcoin Lightning wallet</p>
                  {amountData && (
                     <div className='bg-white bg-opacity-90 p-2 rounded shadow-md'>
                        <div className='flex items-center justify-center space-x-5 text-black'>
                           <div>{formatCents(amountData.amountUsdCents)}</div>
                           <div>|</div>
                           <div>{formatSats(amountData.amountSats)}</div>
                        </div>
                     </div>
                  )}
                  <QRCode value={invoice} size={256} />
                  <ClipboardButton toCopy={invoice} toShow='Copy' className='btn-primary' />
                  <div className='text-black'>
                     {invoiceTimeout ? (
                        <div className='flex flex-col items-center justify-center text-center space-y-4'>
                           <p>Timed out waiting for payment...</p>
                           <button className='underline' onClick={handleCheckAgain}>
                              Check again
                           </button>
                        </div>
                     ) : (
                        <div>
                           <Spinner /> Waiting for payment...
                        </div>
                     )}
                  </div>
               </div>
            );
      }
   };

   const eTipHeader = useMemo(() => {
      if (currentPage === 'loading') {
         return 'Getting invoice...';
      } else {
         return `eTip for ${contact.username}`;
      }
   }, [contact.username, currentPage]);

   return (
      <>
         <Button
            className={`btn-bg-blend ${className}`}
            onClick={() => setShowLightningTipModal(true)}
         >
            eTip
         </Button>
         <Modal show={showLightningTipModal} size='lg' onClose={handleModalClose}>
            <Modal.Header>{eTipHeader}</Modal.Header>
            <Modal.Body>{renderModalContent()}</Modal.Body>
         </Modal>
         <Modal show={showTokenModal} onClose={() => setShowTokenModal(false)}>
            <Modal.Header>eTip for {contact.username}</Modal.Header>
            <SendEcashModalBody token={token} onClose={() => setShowTokenModal(false)} />
         </Modal>
      </>
   );
};

export default LightningTipButton;

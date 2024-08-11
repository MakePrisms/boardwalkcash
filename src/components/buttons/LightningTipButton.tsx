import { Button, Modal, Spinner, TextInput } from 'flowbite-react';
import QRCode from 'qrcode.react';
import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import { useState } from 'react';
import { useToast } from '@/hooks/util/useToast';
import { HttpResponseError, getInvoiceForTip, getTipStatus } from '@/utils/appApiRequests';
import { useForm } from 'react-hook-form';
import { useExchangeRate } from '@/hooks/util/useExchangeRate';
import { formatCents, formatSats } from '@/utils/formatting';

interface LightningTipButtonProps {
   userPubkey: string;
   className?: string;
}

interface TipFormData {
   amount: number;
}

const LightningTipButton = ({ userPubkey, className }: LightningTipButtonProps) => {
   const [showLightningTipModal, setShowLightningTipModal] = useState(false);
   const [fetchingInvoice, setFetchingInvoice] = useState(false);
   const [invoiceTimeout, setInvoiceTimeout] = useState(false);
   const [invoice, setInvoice] = useState('');
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
      setFetchingInvoice(false);
      setInvoice('');
      setShowLightningTipModal(false);
      setInvoiceTimeout(false);
      resetForm();
   };

   const onAmountSubmit = async (data: TipFormData) => {
      const { amount } = data;
      let valid = true;

      if (amount <= 0) {
         valid = false;
      }
      if (amount.toString().split('.')[1].length > 2) {
         valid = false;
      }
      if (isNaN(amount)) {
         valid = false;
      }
      if (!isFinite(amount)) {
         valid = false;
      }
      if (amount > 1000000) {
         valid = false;
      }
      if (!valid) {
         addToast('Invalid amount', 'error');
         return;
      }

      const amountUsdCents = parseFloat(Number(amount).toFixed(2)) * 100;
      const amountSats = await unitToSats(amountUsdCents, 'usd');

      setAmountData({ amountUsdCents, amountSats });

      console.log('amountUsdCents', amountUsdCents);

      await handleLightningTip(amountUsdCents);
   };

   const handleLightningTip = async (amountCents: number) => {
      setFetchingInvoice(true);

      try {
         const { checkingId, invoice } = await getInvoiceForTip(userPubkey, amountCents);

         setInvoice(invoice);
         setFetchingInvoice(false);

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
         return (await getTipStatus(checkingId)).paid;
      } catch (error) {
         console.error('Error fetching tip status', error);
         return false;
      }
   };

   const waitForPayment = async (checkingId: string) => {
      let attempts = 0;
      const maxAttempts = 4;
      const interval = setInterval(async () => {
         const success = await checkPaymentStatus(checkingId);
         if (success) {
            handleModalClose();
            clearInterval(interval);
            addToast('Received!', 'success');
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
         handleModalClose();
         addToast('Received!', 'success');
      } else {
         setInvoiceTimeout(true);
      }
   };

   return (
      <>
         <Button
            className={`btn-bg-blend ${className}`}
            onClick={() => setShowLightningTipModal(true)}
         >
            eTip
         </Button>
         <Modal show={showLightningTipModal} size='lg' onClose={handleModalClose}>
            <Modal.Header>Scan with any Bitcoin Lightning wallet</Modal.Header>
            <Modal.Body>
               {fetchingInvoice ? (
                  <div className='flex flex-col items-center justify-center space-y-3'>
                     <Spinner size='lg' />
                     <p className='text-black'>Getting invoice...</p>
                  </div>
               ) : invoice !== '' ? (
                  <div className='flex flex-col items-center justify-center space-y-4'>
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
               ) : (
                  <form
                     className='flex flex-col  space-y-4'
                     onSubmit={handleSubmit(onAmountSubmit)}
                  >
                     <TextInput
                        type='float'
                        placeholder='Amount in USD (eg. 0.21)'
                        {...register('amount', {
                           required: 'Amount is required',
                           min: { value: 0, message: 'Amount must be positive' },
                        })}
                     />
                     {errors.amount && <span>{errors.amount.message}</span>}
                     <Button type='submit' className='btn-primary'>
                        Continue
                     </Button>
                  </form>
               )}
            </Modal.Body>
         </Modal>
      </>
   );
};

export default LightningTipButton;

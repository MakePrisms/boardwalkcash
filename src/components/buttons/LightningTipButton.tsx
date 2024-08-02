import { Button, Modal, Spinner, TextInput } from 'flowbite-react';
import QRCode from 'qrcode.react';
import ClipboardButton from '@/components/buttons/utility/ClipboardButton';
import { useState } from 'react';
import { useToast } from '@/hooks/util/useToast';
import { getInvoiceForTip, getTipStatus } from '@/utils/appApiRequests';
import { useForm } from 'react-hook-form';

interface LightningTipButtonProps {
   userPubkey: string;
}

interface TipFormData {
   amount: number;
}

const LightningTipButton = ({ userPubkey }: LightningTipButtonProps) => {
   const [showLightningTipModal, setShowLightningTipModal] = useState(false);
   const [fetchingInvoice, setFetchingInvoice] = useState(false);
   const [invoice, setInvoice] = useState('');
   const {
      register,
      handleSubmit,
      formState: { errors },
   } = useForm<TipFormData>();
   const { addToast } = useToast();

   const handleModalClose = () => {
      setFetchingInvoice(false);
      setInvoice('');
      setShowLightningTipModal(false);
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

      console.log('amountUsdCents', amountUsdCents);

      await handleLightningTip(amountUsdCents);
   };

   const handleLightningTip = async (amountCents: number) => {
      setFetchingInvoice(true);

      try {
         const { checkingId, invoice } = await getInvoiceForTip(userPubkey, amountCents);

         setInvoice(invoice);
         setFetchingInvoice(false);

         await waitForPayment(checkingId);
      } catch (error) {
         console.error('Error fetching invoice for tip', error);
         handleModalClose();
         addToast('Error fetching invoice for tip', 'error');
      }
   };

   const waitForPayment = async (checkingId: string) => {
      const interval = setInterval(async () => {
         console.log('looking up payment for ', checkingId + '...');
         const status = await getTipStatus(checkingId).catch(error => {
            console.error('Error fetching tip status', error);
            handleModalClose();
            addToast('Error fetching tip status', 'error');
         });
         if (!status) return;
         if (status.paid) {
            clearInterval(interval);
            handleModalClose();
            addToast('Received!', 'success');
         }
      }, 5000);
   };

   return (
      <>
         <Button className='btn-bg-blend' onClick={() => setShowLightningTipModal(true)}>
            {' '}
            Tip{' '}
         </Button>
         <Modal show={showLightningTipModal} size='lg' onClose={handleModalClose}>
            <Modal.Header>Tip With Bitcoin</Modal.Header>
            <Modal.Body>
               {fetchingInvoice ? (
                  <>
                     <Spinner />
                     <p>Fetching invoice...</p>
                  </>
               ) : invoice !== '' ? (
                  <div className='flex flex-col items-center justify-center space-y-4'>
                     <QRCode value={invoice} size={256} />
                     <ClipboardButton toCopy={invoice} toShow='Copy' />
                     <div className='text-black'>
                        <Spinner /> Waiting for payment...
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
                     <Button type='submit'>Continue</Button>
                  </form>
               )}
            </Modal.Body>
         </Modal>
      </>
   );
};

export default LightningTipButton;

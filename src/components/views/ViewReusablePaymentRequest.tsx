import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import QRCode from 'qrcode.react';
import { useEffect, useState } from 'react';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { decodePaymentRequest } from '@cashu/cashu-ts';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { Spinner } from 'flowbite-react';

const ViewReusablePaymentRequest = () => {
   const [paymentRequest, setPaymentRequest] = useState('');
   const { fetchPaymentRequest, fetchingPaymentRequest } = usePaymentRequests();
   const { activeWallet, activeUnit } = useCashuContext();
   const { isMintless } = useMintlessMode();

   useEffect(() => {
      if (!activeWallet) return;
      if (!activeUnit) return;
      const storedPaymentRequest = localStorage.getItem('paymentRequest');
      if (storedPaymentRequest) {
         console.log('payment request found', storedPaymentRequest);
         const { mints, unit } = decodePaymentRequest(storedPaymentRequest);
         if (
            mints &&
            mints.length > 0 &&
            (!mints?.some(url => url === activeWallet?.mint.mintUrl) || unit !== activeUnit)
         ) {
            fetchPaymentRequest(undefined, true).then(({ pr }) => {
               setPaymentRequest(pr);
               localStorage.setItem('paymentRequest', pr);
            });
         } else {
            setPaymentRequest(storedPaymentRequest);
         }
      } else {
         fetchPaymentRequest(undefined, true).then(({ pr }) => {
            setPaymentRequest(pr);
            localStorage.setItem('paymentRequest', pr);
         });
      }
   }, [activeWallet, activeUnit]);

   return (
      <div className='text-black flex flex-col justify-around items-center gap-6 h-full'>
         {isMintless ? (
            <p>
               You currently have a Lightning Wallet set as your main account. Select an eCash mint
               as your main account to generate an eCash request.
            </p>
         ) : fetchingPaymentRequest ? (
            <Spinner size='xl' />
         ) : (
            <>
               <div className='flex flex-col  gap-6 items-center'>
                  <QRCode value={paymentRequest} size={256} />
                  <p className=' text-center text-sm'>
                     Scan with any cashu wallet that supports payment requests
                  </p>
               </div>
               <ClipboardButton
                  toCopy={paymentRequest}
                  toShow={'Copy Request'}
                  className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
               />
            </>
         )}
      </div>
   );
};

export default ViewReusablePaymentRequest;

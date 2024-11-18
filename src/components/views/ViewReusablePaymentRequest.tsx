import { usePaymentRequests } from '@/hooks/cashu/usePaymentRequests';
import QRCode from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { decodePaymentRequest } from '@cashu/cashu-ts';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { Spinner } from 'flowbite-react';
import { usePolling } from '@/hooks/util/usePolling';
import { useCashu } from '@/hooks/cashu/useCashu';

interface ViewReusablePaymentRequestProps {
   onSuccess?: () => void;
}

const ViewReusablePaymentRequest = ({ onSuccess }: ViewReusablePaymentRequestProps) => {
   const { fetchPaymentRequest, lookupLastPaid } = usePaymentRequests();
   const [paymentRequest, setPaymentRequest] = useState<{ pr: string; id: string } | null>(null);
   const [lastPaid, setLastPaid] = useState<string | null>(null);
   const { activeWallet, activeUnit } = useCashuContext();
   const { handleClaimToSourceMint } = useCashu();
   const { isMintless } = useMintlessMode();

   const pollPaymentRequest = useCallback(async () => {
      if (!paymentRequest?.id) return;

      try {
         const res = await lookupLastPaid(paymentRequest.id);

         if (!lastPaid) {
            /* First time checking - initialize lastPaid */
            setLastPaid(res.lastPaid || new Date(0).toISOString());
            return;
         }

         if (res.lastPaid && res.lastPaid > lastPaid) {
            /* payment request was paid since this component has been open */
            handleClaimToSourceMint(res.token);
            onSuccess?.();
         }
      } catch (e) {
         console.warn('Failed to poll payment request:', e);
      }
   }, [paymentRequest?.id, lastPaid, lookupLastPaid, handleClaimToSourceMint, onSuccess]);

   usePolling(pollPaymentRequest, 1000);

   useEffect(() => {
      if (!activeWallet) return;
      if (!activeUnit) return;
      const storedPaymentRequest = localStorage.getItem('paymentRequest');
      const storedRequestId = localStorage.getItem('paymentRequestId');
      if (storedPaymentRequest && storedRequestId) {
         console.log('payment request found', storedPaymentRequest);
         const { mints, unit } = decodePaymentRequest(storedPaymentRequest);
         if (
            mints &&
            mints.length > 0 &&
            (!mints?.some(url => url === activeWallet?.mint.mintUrl) || unit !== activeUnit)
         ) {
            fetchPaymentRequest(undefined, true).then(({ pr, id }) => {
               setPaymentRequest({ pr, id });
               localStorage.setItem('paymentRequest', pr);
               localStorage.setItem('paymentRequestId', id);
            });
         } else {
            setPaymentRequest({ pr: storedPaymentRequest, id: storedRequestId });
         }
      } else {
         fetchPaymentRequest(undefined, true).then(({ pr, id }) => {
            setPaymentRequest({ pr, id });
            localStorage.setItem('paymentRequest', pr);
            localStorage.setItem('paymentRequestId', id);
         });
      }
   }, [activeWallet, activeUnit, fetchPaymentRequest]);

   return (
      <div className='text-black flex flex-col justify-around items-center gap-6 h-full'>
         {isMintless ? (
            <p>
               You currently have a Lightning Wallet set as your main account. Select an eCash mint
               as your main account to generate an eCash request.
            </p>
         ) : paymentRequest === null ? (
            <Spinner size='xl' />
         ) : (
            <>
               fetchingPaymentRequest
               <div className='flex flex-col  gap-6 items-center'>
                  <QRCode value={paymentRequest.pr} size={256} />
                  <p className=' text-center text-sm'>
                     Scan with any cashu wallet that supports payment requests
                  </p>
               </div>
               <ClipboardButton
                  toCopy={paymentRequest.pr}
                  toShow={'Copy Request'}
                  className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
               />
            </>
         )}
      </div>
   );
};

export default ViewReusablePaymentRequest;

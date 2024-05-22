import { useCashu } from '@/hooks/useCashu';
import { useToast } from '@/hooks/useToast';
import {
   CashuWallet,
   Proof,
   Token,
   TokenEntry,
   getDecodedToken,
   getEncodedToken,
} from '@cashu/cashu-ts';
import { Modal, Spinner } from 'flowbite-react';
import React, { useEffect, useState } from 'react';
import AnimatedQRCode from '../AnimatedQR';
import ClipboardButton from '../buttons/utility/ClipboardButton';
import QRCode from 'qrcode.react';
import CustomCarousel from '../Carousel/CustomCarousel';
import { useDispatch } from 'react-redux';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';

interface SendEcashModalBodyProps {
   amountUsd: number;
   onClose: () => void;
}

const SendEcashModalBody = ({ amountUsd, onClose }: SendEcashModalBodyProps) => {
   const [sending, setSending] = useState(false);
   const [sendAmount, setSendAmount] = useState('');
   const [tokenEntryData, setTokenEntryData] = useState<{
      proofs: Proof[];
      wallet: CashuWallet;
   } | null>(null);
   const [encodedToken, setEncodedToken] = useState<string | null>(null);
   const [carouselSlides, setCarouselSlides] = useState<React.ReactNode[]>([]);

   const dispatch = useDispatch();

   const { addToast } = useToast();
   const { swapToSend } = useCashu();

   useEffect(() => {
      if (!tokenEntryData) return;

      const token: Token = {
         token: [
            {
               proofs: tokenEntryData.proofs,
               mint: tokenEntryData.wallet.mint.mintUrl,
            } as TokenEntry,
         ],
         unit: 'usd',
      };

      const encodedToken = getEncodedToken(token);

      console.log('Encoded Token', encodedToken);

      console.log('DECODED', getDecodedToken(encodedToken));

      setEncodedToken(encodedToken.replace('Token:', ''));
      setSending(false);

      dispatch(
         addTransaction({
            type: 'ecash',
            transaction: {
               token: encodedToken,
               amount: -amountUsd,
               unit: 'usd',
               mint: tokenEntryData.wallet.mint.mintUrl,
               status: TxStatus.PENDING,
               date: new Date().toLocaleString(),
            },
         }),
      );
   }, [tokenEntryData]);

   useEffect(() => {
      const handleSendEcash = async () => {
         console.log('Send Ecash', amountUsd);
         if (amountUsd <= 0) {
            addToast('Enter an amount to send', 'error');
            return;
         }
         setSending(true);

         console.log(
            'TOtal balance. About to send',
            (JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[]).reduce(
               (a, b) => a + b.amount,
               0,
            ),
         );

         const { proofs: newProofs, wallet } = await swapToSend(amountUsd);

         console.log(
            'Balance after sending',
            (JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[]).reduce(
               (a, b) => a + b.amount,
               0,
            ),
         );

         console.log('Send Ecash', newProofs);

         if (!newProofs) {
            return;
         }

         setTokenEntryData({ proofs: newProofs, wallet });
      };
      handleSendEcash().finally(() => setSending(false));
   }, [amountUsd]);

   useEffect(() => {
      if (!encodedToken) return;
      setCarouselSlides([
         <div className='text-black text-center space-y-2 ml-2' key='1'>
            <h2 className='text-xl'>Shareable Boardwalk Cash Link</h2>
            <QRCode
               value={`${window.location.protocol}//${window.location.host}/wallet?token=${encodedToken}`}
               size={window.innerWidth < 768 ? 275 : 400}
            />
            <p> Link: {`boardwalkcash.com...`}</p>
         </div>,
         <div className='text-black text-center space-y-2' key='2'>
            <h2 className='text-xl'>Ecash Token</h2>
            <AnimatedQRCode encodedToken={`${encodedToken}`} />
            <p> Token: {`${encodedToken.slice(0, 12)}...${encodedToken.slice(-5)}`}</p>
         </div>,
      ]);
      return () => {};
   }, [encodedToken]);

   return (
      <>
         <Modal.Body>
            {sending ? (
               <div className='flex flex-col space-y-4 justify-center items-center'>
                  <Spinner size='xl' />
                  <div className='text-black'>Creating sendable tokens...</div>
               </div>
            ) : (
               <div className='flex flex-col justify-center items-center text-black space-y-3'>
                  {encodedToken && (
                     <>
                        <div className='max-w-full'>
                           <CustomCarousel slides={carouselSlides} />
                        </div>
                        <div className='flex space-x-3'>
                           <ClipboardButton
                              toCopy={`${window.location.protocol}//${window.location.host}/wallet?token=${encodedToken}`}
                              toShow={`Link`}
                              onClick={onClose}
                           />
                           <ClipboardButton
                              toCopy={`${encodedToken}`}
                              toShow={`Token`}
                              onClick={onClose}
                           />
                        </div>
                     </>
                  )}
               </div>
            )}
         </Modal.Body>
      </>
   );
};

export default SendEcashModalBody;

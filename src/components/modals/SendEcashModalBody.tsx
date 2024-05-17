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

interface SendEcashModalBodyProps {
   amountUsd: number;
}

const SendEcashModalBody = ({ amountUsd }: SendEcashModalBodyProps) => {
   const [sending, setSending] = useState(false);
   const [sendAmount, setSendAmount] = useState('');
   const [tokenEntryData, setTokenEntryData] = useState<{
      proofs: Proof[];
      wallet: CashuWallet;
   } | null>(null);
   const [encodedToken, setEncodedToken] = useState<string | null>(null);
   const [carouselSlides, setCarouselSlides] = useState<React.ReactNode[]>([]);

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
            <AnimatedQRCode encodedToken={`Token:${encodedToken}`} />
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
                              toShow={`Copy Link`}
                           />
                           <ClipboardButton toCopy={`${encodedToken}`} toShow={`Copy Token`} />
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

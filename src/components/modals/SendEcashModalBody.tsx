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
import { Modal } from 'flowbite-react';
import { useEffect, useState } from 'react';
import AnimatedQRCode from '../AnimatedQR';
import ClipboardButton from '../buttons/utility/ClipboardButton';

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
   const [urFragment, setURFragment] = useState<string | null>(null);

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

      handleSendEcash();
   }, [amountUsd]);
   return (
      <>
         <Modal.Body>
            {!sending ? (
               <div>Loading...</div>
            ) : (
               <div className='flex flex-col justify-center items-center my-8 text-black space-y-3'>
                  {encodedToken && (
                     <>
                        <AnimatedQRCode text={`${encodedToken}`} chunkSize={250} />
                        <p> Token: {`${encodedToken.slice(0, 12)}...${encodedToken.slice(-5)}`}</p>
                        <ClipboardButton toCopy={encodedToken} toShow={`Copy`} />
                     </>
                  )}
               </div>
            )}
         </Modal.Body>
      </>
   );
};

export default SendEcashModalBody;

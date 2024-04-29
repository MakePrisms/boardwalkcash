import { useCashu } from '@/hooks/useCashu';
import { useToast } from '@/hooks/useToast';
import {
   Proof,
   getEncodedToken,
   Token,
   TokenEntry,
   CashuWallet,
   getDecodedToken,
} from '@cashu/cashu-ts';
import { Button, Modal } from 'flowbite-react';
import { useEffect, useState } from 'react';

interface SendEcashModalProps {
   showModal: boolean;
   closeModal: () => void;
}

export const SendEcashModal = ({ showModal, closeModal }: SendEcashModalProps) => {
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
   const handleSendEcash = async () => {
      if (parseFloat(sendAmount) <= 0) {
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

      const { proofs: newProofs, wallet } = await swapToSend(parseFloat(sendAmount) * 100);

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

   return (
      <Modal show={showModal} onClose={closeModal}>
         <Modal.Header>
            <h2>Send Ecash</h2>
         </Modal.Header>
         <Modal.Body>
            {!sending ? (
               <>
                  <input
                     className='form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none mb-4'
                     type='number'
                     placeholder='Amount in USD (eg. 0.21)'
                     value={sendAmount || ''}
                     onChange={e => setSendAmount(() => e.target.value)}
                  />
                  <div className='flex items-center flex-row justify-around'>
                     {/* <Button color='failure' onClick={handleBackClick}>
                   Back
                </Button> */}
                     <Button
                        // isProcessing={isFetchingInvoice}
                        color='info'
                        onClick={handleSendEcash}
                     >
                        Continue
                     </Button>
                  </div>
               </>
            ) : (
               <div className='flex justify-center items-center my-8 text-black'>
                  {encodedToken && (
                     <>
                        {/* <AnimatedQRCode encodedToken={encodedToken} /> */}
                        <p className='break-words overflow-x-clip'> Token: {encodedToken}</p>
                     </>
                  )}
               </div>
            )}
         </Modal.Body>
      </Modal>
   );
};

export default SendEcashModal;

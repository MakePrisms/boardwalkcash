import { useCashu } from '@/hooks/cashu/useCashu';
import { useToast } from '@/hooks/util/useToast';
import { Proof } from '@cashu/cashu-ts';
import { Button, Modal } from 'flowbite-react';
import { useState } from 'react';

interface SendEcashModalProps {
   showModal: boolean;
   closeModal: () => void;
}

export const SendEcashModal = ({ showModal, closeModal }: SendEcashModalProps) => {
   const [sending, setSending] = useState(false);
   const [sendAmount, setSendAmount] = useState('');
   const [encodedToken, setEncodedToken] = useState<string | null>(null);
   const [urFragment, setURFragment] = useState<string | null>(null);

   const { addToast } = useToast();
   const { createSendableToken } = useCashu();
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

      const token = await createSendableToken(parseFloat(sendAmount) * 100);

      if (!token) {
         return;
      }

      setEncodedToken(token.replace('Token:', ''));
   };

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
                        className='btn-primary'
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

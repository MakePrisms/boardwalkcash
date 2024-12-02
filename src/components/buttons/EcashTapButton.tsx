import { useToast } from '@/hooks/util/useToast';
import { RootState, useAppDispatch } from '@/redux/store';
import { Modal } from 'flowbite-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import SendEcashModalBody from '@/components/modals/SendEcashModalBody';
import { resetStatus, setSending } from '@/redux/slices/ActivitySlice';
import { useCashu } from '@/hooks/cashu/useCashu';
import { isMobile } from 'react-device-detect';

export const BanknoteIcon = ({ className }: { className?: string }) => (
   <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
      strokeWidth={1.5}
      stroke='currentColor'
      className={className}
   >
      <path
         strokeLinecap='round'
         strokeLinejoin='round'
         d='M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z'
      />
   </svg>
);

const EcashTapButton = () => {
   const [creatingToken, setCreatingToken] = useState(false);
   const [tokenToSend, setTokenToSend] = useState<string | undefined>(undefined);
   const [showEcashTapModal, setShowEcashTapModal] = useState(false);
   const dispatch = useAppDispatch();

   const { createSendableToken } = useCashu();
   const { ecashTapsEnabled, defaultTapAmount } = useSelector((state: RootState) => state.settings);

   const { addToast } = useToast();

   if (!ecashTapsEnabled) return null;

   const handleEcashTapClicked = async () => {
      if (isMobile) {
         setShowEcashTapModal(true);
      } else {
         dispatch(setSending('Creating tap token...'));
      }
      try {
         setCreatingToken(true);

         const token = await createSendableToken(defaultTapAmount);

         if (!token) {
            throw new Error('Error creating tap token');
         }

         if (isMobile) {
            console.log('Sending token to mobile');
            setTokenToSend(token);
         } else {
            navigator.clipboard
               .writeText(
                  `${window.location.protocol}//${window.location.host}/wallet?token=${token}`,
               )
               .then(() =>
                  addToast(
                     `$${(defaultTapAmount / 100).toFixed(2)} copied to clipboard`,
                     'success',
                  ),
               )
               .catch(e => {
                  addToast(
                     'Error copying token to clipboard. Reclaim in transaction history.',
                     'error',
                  );
               });
         }
      } catch (e: any) {
         console.error(e);
         // addToast(`Error creating tap token: ${e.detail && e.detail}`, 'error');
      } finally {
         setCreatingToken(false);
         dispatch(resetStatus());
      }
   };

   return (
      <>
         <button
            disabled={creatingToken}
            onClick={handleEcashTapClicked}
            className='fixed left-0 top-0 m-4 p-2 z-10'
         >
            <BanknoteIcon className='size-6' />
         </button>
         <Modal
            show={showEcashTapModal}
            onClose={() => {
               setTokenToSend(undefined);
               setShowEcashTapModal(false);
            }}
         >
            <Modal.Header>
               <h2>Send Ecash</h2>
            </Modal.Header>
            <SendEcashModalBody
               token={tokenToSend}
               onClose={() => {
                  setTokenToSend(undefined);
                  setShowEcashTapModal(false);
               }}
            />
         </Modal>
      </>
   );
};

export default EcashTapButton;

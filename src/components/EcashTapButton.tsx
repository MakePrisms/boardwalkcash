import { useCashu } from '@/hooks/useCashu';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';
import { RootState } from '@/redux/store';
import { useState } from 'react';
import { useSelector } from 'react-redux';

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

   const { createSendableEcashToken } = useCashu();
   const { ecashTapsEnabled, defaultTapAmount } = useSelector((state: RootState) => state.settings);

   const { getActiveWallet } = useWallet();
   const { addToast } = useToast();

   if (!ecashTapsEnabled) return null;

   const handleEcashTapClicked = async () => {
      try {
         const wallet = getActiveWallet();

         setCreatingToken(true);

         const token = await createSendableEcashToken(defaultTapAmount, wallet);

         if (!token) {
            addToast('Error creating tap token', 'error');
            return;
         }

         navigator.clipboard
            .writeText(token)
            .then(() =>
               addToast(`$${(defaultTapAmount / 100).toFixed(2)} copied to clipboard`, 'success'),
            )
            .catch(e => addToast('Error copying token to clipboard' + e.message, 'error'));
      } catch (e: any) {
         addToast(`Error creating tap token: ${e.message && e.message}`, 'error');
      } finally {
         setCreatingToken(false);
      }
   };

   return (
      <button
         disabled={creatingToken}
         onClick={handleEcashTapClicked}
         className='fixed left-0 top-0 m-4 p-2 z-10'
      >
         <BanknoteIcon className='size-6' />
      </button>
   );
};

export default EcashTapButton;

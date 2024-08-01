import { useCashu } from '@/hooks/cashu/useCashu';
import { Token } from '@cashu/cashu-ts';
import { Spinner } from 'flowbite-react';
import { useState } from 'react';

interface ClaimTokenButtonProps {
   token: Token;
   clearNotification: () => void;
}

const ClaimTokenButton = ({ token, clearNotification }: ClaimTokenButtonProps) => {
   const [claiming, setClaiming] = useState(false);
   const { claimToken } = useCashu();
   const handleClaim = async () => {
      const privkey = window.localStorage.getItem('privkey');
      if (!privkey) {
         throw new Error('No private key found');
      }
      setClaiming(true);
      try {
         if (await claimToken(token, privkey)) {
            clearNotification();
         }
      } catch (e) {
      } finally {
         setClaiming(false);
      }
   };

   return claiming ? (
      <Spinner size='sm' color='primary' />
   ) : (
      <button className='btn-notification' onClick={handleClaim}>
         claim
      </button>
   );
};

export default ClaimTokenButton;

import { RootState } from '@/redux/store';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { useSelector } from 'react-redux';
import { useToast } from './useToast';

export const useWallet = () => {
   const wallet = useSelector((state: RootState) => state.wallet);
   const { addToast } = useToast();
   const getActiveWallet = () => {
      const activeKeyset = Object.values(wallet.keysets).find(wallet => wallet.active);

      if (!activeKeyset) {
         addToast('Unexpected error: no active wallet found', 'error');
         throw new Error('No active wallet found');
      }

      const activeWallet = new CashuWallet(new CashuMint(activeKeyset?.url), activeKeyset);

      return activeWallet;
   };

   return { getActiveWallet };
};

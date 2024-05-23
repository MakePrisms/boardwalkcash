import React, { useState, useEffect, useRef } from 'react';
import Balance from '@/components/Balance';
import Receive from '@/components/buttons/lightning/Receive';
import Send from '@/components/buttons/lightning/Send';
import { useNwc } from '@/hooks/useNwc';
import { useCashu } from '@/hooks/useCashu';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/store';
import { initializeUser } from '@/redux/slices/UserSlice';
import { addKeyset, initializeKeysets } from '@/redux/slices/Wallet.slice';
import Disclaimer from '@/components/Disclaimer';
import ActivityIndicator from '@/components/ActivityIndicator';
import { setSuccess } from '@/redux/slices/ActivitySlice';
import SettingsSidebar from '@/components/sidebar/SettingsSidebar';
import { CashuMint, CashuWallet, Token, getDecodedToken } from '@cashu/cashu-ts';
import useNwc2 from '@/hooks/useNwc2';
import { useRouter } from 'next/router';
import { useToast } from '@/hooks/useToast';
import ProcessingSwapModal from '@/components/sidebar/ProcessingSwapModal';
import ConfirmEcashReceiveModal from '@/components/modals/ConfirmEcashReceiveModal';
import TransactionHistoryDrawer from '@/components/transactionHistory/TransactionHistoryDrawer';

export default function Home() {
   const newUser = useRef(false);
   const [swapping, setSwapping] = useState(false);
   const [tokenDecoded, setTokenDecoded] = useState<Token | null>(null);
   const [ecashReceiveModalOpen, setEcashReceiveModalOpen] = useState(false);
   const router = useRouter();

   const dispatch = useAppDispatch();
   const wallets = useSelector((state: RootState) => state.wallet.keysets);
   const user = useSelector((state: RootState) => state.user);
   const { addToast } = useToast();

   const { updateProofsAndBalance, checkProofsValid, swapToMain } = useCashu();

   useEffect(() => {
      if (!router.isReady) return;
      const { token } = router.query;
      const localKeysets = window.localStorage.getItem('keysets');

      const handleTokenQuery = async (token: string) => {
         const decoded = getDecodedToken(token);

         if (decoded.token.length !== 1) {
            throw new Error(
               `We do not support multiple tokens in a single token yet. Got ${decoded.token.length} tokens`,
            );
         }

         setTokenDecoded(decoded);

         const url = decoded.token[0].mint;

         if (!localKeysets) {
            newUser.current = true;
            try {
               const mint = new CashuMint(url);

               const { keysets } = await mint.getKeys();

               const usdKeyset = keysets.find(keyset => keyset.unit === 'usd');

               if (!usdKeyset) {
                  addToast("Mint doesn't support USD", 'error');
                  return;
               }

               dispatch(addKeyset({ keyset: usdKeyset, url: url, active: true }));

               addToast('Mint added successfully', 'success');

               await dispatch(initializeUser());
               setEcashReceiveModalOpen(true);
            } catch (error) {
               console.error(error);
            }
         } else {
            if (newUser.current === true) return;
            dispatch(initializeKeysets());
            dispatch(initializeUser());

            setEcashReceiveModalOpen(true);
         }
      };

      if (token) {
         handleTokenQuery(token as string);
      } else if (!localKeysets) {
         router.push('/setup');
      } else {
         dispatch(initializeUser());
         dispatch(initializeKeysets());

         let params = new URL(document.location.href).searchParams;
         if (params.get('just_connected') === 'true') {
            dispatch(setSuccess('Connected to Zap Bot!'));
         }
      }
   }, [router.isReady]);

   useEffect(() => {
      if (tokenDecoded) return;
      let intervalCount = 0;

      // updateProofsAndBalance();

      const intervalId = setInterval(() => {
         updateProofsAndBalance();

         // Increment the counter
         intervalCount += 1;

         // Every fourth interval, call checkProofsValid
         if (intervalCount >= 8) {
            Object.values(wallets).forEach(async w => {
               const wallet = new CashuWallet(new CashuMint(w.url), { ...w });
               await checkProofsValid(wallet);
            });
            intervalCount = 0;
         }
      }, 3000); // Poll every 3 seconds

      return () => {
         clearInterval(intervalId);
      };
   }, [dispatch, tokenDecoded]);

   const balance = useSelector((state: RootState) => state.wallet.balance);

   useNwc();
   useNwc2({ privkey: user.privkey, pubkey: user.pubkey });

   return (
      <>
         <main
            className='flex flex-col items-center justify-center mx-auto'
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
         >
            <Balance balance={balance.usd} />
            <ActivityIndicator />
            <div className=' flex flex-col justify-center py-8 w-full'>
               <div className='flex flex-row justify-center mx-auto'>
                  <Receive />
                  <Send />
               </div>
            </div>
            <footer className='fixed inset-x-0 bottom-0 text-center p-4 shadow-md flex flex-col items-center justify-center'>
               <Disclaimer />
            </footer>
         </main>
         <SettingsSidebar />
         <TransactionHistoryDrawer />
         <ProcessingSwapModal isSwapping={swapping} />
         {tokenDecoded && !newUser.current && ecashReceiveModalOpen && (
            <ConfirmEcashReceiveModal
               token={tokenDecoded}
               isOpen={ecashReceiveModalOpen}
               onClose={() => {
                  setEcashReceiveModalOpen(false);
                  setTokenDecoded(null);
                  router.push('/wallet');
               }}
            />
         )}
      </>
   );
}

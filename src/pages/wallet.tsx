import React, { useState, useEffect } from 'react';
import Balance from '@/components/Balance';
import Receive from '@/components/buttons/lightning/Receive';
import Send from '@/components/buttons/lightning/Send';
import { useNwc } from '@/hooks/useNwc';
import { useCashu } from '@/hooks/useCashu';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/store';
import { initializeUser } from '@/redux/slices/UserSlice';
import { initializeKeysets } from '@/redux/slices/Wallet.slice';
import Disclaimer from '@/components/Disclaimer';
import ActivityIndicator from '@/components/ActivityIndicator';
import { setSuccess } from '@/redux/slices/ActivitySlice';
import SettingsSidebar from '@/components/sidebar/SettingsSidebar';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import useNwc2 from '@/hooks/useNwc2';

export default function Home() {
   const [showZapBotButton, setShowZapBotButton] = useState(false);

   const dispatch = useAppDispatch();
   const wallets = useSelector((state: RootState) => state.wallet.keysets);
   const user = useSelector((state: RootState) => state.user);

   const { updateProofsAndBalance, checkProofsValid } = useCashu();

   useEffect(() => {
      const localKeysets = window.localStorage.getItem('keysets');

      if (!localKeysets) {
         window.location.href = '/setup';
      } else {
         dispatch(initializeUser());
         dispatch(initializeKeysets());

         if (!window.localStorage.getItem('nwa')) {
            setShowZapBotButton(true);
         }

         let params = new URL(document.location.href).searchParams;
         if (params.get('just_connected') === 'true') {
            dispatch(setSuccess('Connected to Zap Bot!'));
            setShowZapBotButton(false);
         }
      }
   }, [dispatch]);

   useEffect(() => {
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
   }, [dispatch]);

   const balance = useSelector((state: RootState) => state.wallet.balance);

   useNwc();
   useNwc2({ privkey: user.privkey, pubkey: user.pubkey });
   useCashu();

   return (
      <>
         <main className='flex flex-col items-center justify-center mx-auto min-h-screen'>
            <Balance balance={balance.usd} />
            <ActivityIndicator />
            <div className='py-8 w-full'>
               <div className='flex flex-row justify-center mx-auto'>
                  <Receive />
                  <Send />
               </div>
            </div>
            <footer className='fixed inset-x-0 bottom-0 text-center p-4 shadow-md flex  flex-col items-center justify-center'>
               {/* {showZapBotButton && <ZapBotButton />} */}
               <Disclaimer />
            </footer>
         </main>
         <SettingsSidebar />
      </>
   );
}

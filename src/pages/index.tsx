import React, { useState, useEffect } from 'react';
import Balance from '@/components/Balance';
import Receive from '@/components/buttons/lightning/Receive';
import Send from '@/components/buttons/lightning/Send';
import { CashuMint, CashuWallet, Proof } from '@cashu/cashu-ts';
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
import ZapBotButton from '@/components/buttons/ZapBotButton';
import SettingsSidebar from '@/components/sidebar/SettingsSidebar';

export default function Home() {
   const [showZapBotButton, setShowZapBotButton] = useState(false);

   const dispatch = useAppDispatch();

   useEffect(() => {
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
   }, [dispatch]);

   const balance = useSelector((state: RootState) => state.wallet.balance);

   useNwc();
   useCashu();

   return (
      <>
         <main className='flex flex-col items-center justify-center mx-auto min-h-screen'>
            <Balance balance={balance} />
            <ActivityIndicator />
            <div className='py-8 w-full'>
               <div className='flex flex-row justify-center mx-auto'>
                  <Receive />
                  <Send />
               </div>
            </div>
            <footer className='fixed inset-x-0 bottom-0 text-center p-4 shadow-md flex  flex-col items-center justify-center'>
               {showZapBotButton && <ZapBotButton />}
               <Disclaimer />
            </footer>
         </main>
         {/* <SettingsSidebar /> */}
      </>
   );
}

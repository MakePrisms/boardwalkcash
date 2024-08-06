import React, { useState, useEffect, useRef } from 'react';
import Balance from '@/components/Balance';
import Receive from '@/components/buttons/Receive';
import Send from '@/components/buttons/Send';
import { useProofManager } from '@/hooks/cashu/useProofManager.ts';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/store';
import { initializeUser } from '@/redux/slices/UserSlice';
import { initializeKeysets } from '@/redux/slices/Wallet.slice';
import Disclaimer from '@/components/Disclaimer';
import ActivityIndicator from '@/components/ActivityIndicator';
import { setSuccess } from '@/redux/slices/ActivitySlice';
import SettingsSidebar from '@/components/sidebar/SettingsSidebar';
import { CashuMint, CashuWallet, Token, getDecodedToken } from '@cashu/cashu-ts';
import useNwc from '@/hooks/nostr/useNwc';
import { useRouter } from 'next/router';
import { useToast } from '@/hooks/util/useToast';
import ConfirmEcashReceiveModal from '@/components/modals/ConfirmEcashReceiveModal';
import TransactionHistoryDrawer from '@/components/transactionHistory/TransactionHistoryDrawer';
import EcashTapButton from '@/components/EcashTapButton';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { PublicContact, TokenProps } from '@/types';
import { findContactByPubkey, isContactsTrustedMint } from '@/lib/contactModels';
import { proofsLockedTo } from '@/utils/cashu';
import { formatUrl } from '@/utils/url';
import NotificationDrawer from '@/components/notifications/NotificationDrawer';
import { formatCents } from '@/utils/formatting';

export default function Home({ isMobile }: { isMobile: boolean }) {
   const newUser = useRef(false);
   const [tokenDecoded, setTokenDecoded] = useState<Token | null>(null);
   const [ecashReceiveModalOpen, setEcashReceiveModalOpen] = useState(false);
   const router = useRouter();
   const { balance, proofsLockedTo } = useCashu();
   const { addWallet } = useCashuContext();

   const dispatch = useAppDispatch();
   const wallets = useSelector((state: RootState) => state.wallet.keysets);
   const user = useSelector((state: RootState) => state.user);
   const { addToast } = useToast();
   const { updateProofsAndBalance, checkProofsValid } = useProofManager();

   useEffect(() => {
      if (!router.isReady) return;
      const { token } = router.query;
      const localKeysets = window.localStorage.getItem('keysets');

      const handleTokenQuery = async (token: string) => {
         const decoded = getDecodedToken(token);
         // make wallet view-only if token is locked and boardwalk has not been initialized
         if (proofsLockedTo(decoded.token[0].proofs) && !localKeysets) {
            setTokenDecoded(decoded);
            setEcashReceiveModalOpen(true);

            return;
         }

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

               addWallet(usdKeyset, url, { active: true });

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

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const checkProofsSequentially = async () => {
         await delay(6000);
         for await (const w of Object.values(wallets)) {
            const wallet = new CashuWallet(new CashuMint(w.url), { ...w });
            await checkProofsValid(wallet).catch();

            // Wait 1 second between each check (adjust as needed)
            await delay(10000);
         }
      };

      checkProofsSequentially();

      const intervalId = setInterval(() => {
         updateProofsAndBalance();

         // Increment the counter
         intervalCount += 1;

         // Every eighth interval, call checkProofsValid
         if (intervalCount >= 8) {
            // checkProofsSequentially();
            intervalCount = 0;
         }
      }, 3000); // Poll every 3 seconds

      return () => {
         clearInterval(intervalId);
      };
   }, [dispatch, tokenDecoded]);

   useEffect(() => {
      // uses session storage to identify the tab so we can ignore incoming messages from the same tab
      if (!sessionStorage.getItem('tabId')) {
         sessionStorage.setItem(
            'tabId',
            Math.random().toString(36).substring(2) + new Date().getTime().toString(36),
         );
         console.log('Tab ID set to ' + sessionStorage.getItem('tabId'));
      }
      const tabId = sessionStorage.getItem('tabId');
      const channel = new BroadcastChannel('app_channel');
      channel.postMessage({ type: 'new_tab_opened', senderId: tabId });
      channel.onmessage = async event => {
         // console.log("Received message in tab " + tabId, event.data);
         if (event.data.senderId === tabId) {
            return; // Ignore the message if it comes from the same tab
         }
         if (event.data.type == 'new_tab_opened') {
            channel.postMessage({ type: 'already_running', senderId: tabId });
         } else if (event.data.type == 'already_running') {
            console.log('already running');
            window.location.href = '/already-running';
         }
      };
      return () => {};
   }, []);

   useNwc({ privkey: user.privkey, pubkey: user.pubkey });

   // if (!user.pubkey) return null;

   return (
      <>
         <main
            className='flex flex-col items-center justify-center mx-auto'
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
         >
            <Balance balance={balance} />
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
         {/* TOOD: add loading state for when user is not initialized */}
         <NotificationDrawer />
         <SettingsSidebar />
         <TransactionHistoryDrawer />
         <EcashTapButton isMobile={isMobile} />
         {tokenDecoded && !newUser.current && ecashReceiveModalOpen && (
            <ConfirmEcashReceiveModal
               token={tokenDecoded}
               isOpen={ecashReceiveModalOpen}
               onClose={() => {
                  // modal should not be closable if token is locked and boardwalk has not been initialized
                  if (
                     proofsLockedTo(tokenDecoded.token[0].proofs) &&
                     !window.localStorage.getItem('keysets')
                  ) {
                     return;
                  }
                  setEcashReceiveModalOpen(false);
                  setTokenDecoded(null);
                  router.push('/wallet');
               }}
            />
         )}
      </>
   );
}

export const getServerSideProps: GetServerSideProps = async (
   context: GetServerSidePropsContext,
) => {
   const userAgent = context.req.headers['user-agent'];
   const isMobile = /mobile/i.test(userAgent as string);

   const token = context.query.token as string;

   let tokenData: TokenProps | null = null;
   if (token) {
      const decoded = getDecodedToken(token);

      const pubkey = proofsLockedTo(decoded.token[0].proofs);

      let contact: PublicContact | null = null;
      if (pubkey) {
         contact = await findContactByPubkey(pubkey.slice(2));
      }

      const mintUrl = decoded.token[0].mint;

      let isTrustedMint = null;
      if (contact) {
         isTrustedMint = await isContactsTrustedMint(contact, mintUrl);
      }

      const amount = decoded.token[0].proofs.reduce((acc, curr) => acc + curr.amount, 0);
      tokenData = {
         amount,
         contact,
         token,
         mintUrl,
         isTrustedMint,
      };
   }

   return {
      props: {
         isMobile,
         pageTitle: pageTitle(tokenData) || null,
         pageDescription: pageDescription(tokenData) || null,
      },
   };
};

const pageTitle = (tokenData: TokenProps | null) => {
   if (tokenData) {
      const { amount, contact, isTrustedMint } = tokenData;
      if (contact) {
         return `${formatCents(amount)} eTip ${contact.username ? `for ${contact.username}` : ''}`;
      }
      return `${formatCents(amount)} eCash`;
   }
};

const pageDescription = (tokenData: TokenProps | null) => {
   if (tokenData) {
      const { amount, contact, mintUrl, isTrustedMint } = tokenData;

      if (mintUrl.includes('stablenut.umint.cash')) {
         return `Stablenut (4.9 ⭐️)`;
      } else if (mintUrl.includes('mint.lnvoltz.com')) {
         return `Voltz (5.0 ⭐️)`;
      } else {
         return `${formatUrl(mintUrl, 35)}`;
      }
   }
};

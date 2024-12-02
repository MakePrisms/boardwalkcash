import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { useNDK } from '@/hooks/nostr/useNDK';
import { MetricsResponse, useNostrMintConnect } from '@/hooks/nostr/useNostrMintConnect';
import { useProofStorage } from '@/hooks/cashu/useProofStorage';
import { useToast } from '@/hooks/util/useToast';
import { setSuccess } from '@/redux/slices/ActivitySlice';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useAppDispatch } from '@/redux/store';
import { createBlindedMessages } from '@/utils/crypto';
import { CashuMint, getEncodedTokenV4 } from '@cashu/cashu-ts';
import { constructProofs } from '@/utils/crypto';
import EyeIcon from '@heroicons/react/20/solid/EyeIcon';
import EyeSlashIcon from '@heroicons/react/20/solid/EyeSlashIcon';
import { Badge, Button, Spinner } from 'flowbite-react';
import { useCallback, useEffect, useState } from 'react';
import ConnectReserve from './ConnectReserve';
import { formatCents } from '@/utils/formatting';

const ConnectWalletSetting = () => {
   const [connectionString, setConnectionString] = useState('');
   const [connected, setConnected] = useState(false);
   const [mintingAmount, setMintingAmount] = useState<undefined | number>();
   const [fetchingMint, setFetchingMint] = useState(false);
   const [showMetrics, setShowMetrics] = useState(false);
   const [metrics, setMetrics] = useState<MetricsResponse>({
      backend_balance: 0,
      mint_balance: 0,
   });
   const [nwcUri, setNwcUri] = useState('');

   const dispatch = useAppDispatch();
   const { requestSignatures, reserveMetrics } = useNostrMintConnect();
   const { addToast } = useToast();
   // const { generateNip98Header } = useNDK();
   const { setKeysetNotReserve, reserveWallet, connectReserve } = useCashuContext();
   const { addProofs } = useProofStorage();

   useEffect(() => {
      if (reserveWallet !== null) {
         setConnected(true);
      } else {
         setConnected(false);
      }
   }, [reserveWallet]);

   useEffect(() => {
      const reserve = localStorage.getItem('reserve');

      if (reserve) {
         setConnectionString(reserve);
         setConnected(true);
      } else {
         setConnected(false);
      }
   }, []);

   useEffect(() => {
      if (!connectionString) return;
      handleGetReserveMetrics();
      return () => {};
   }, [connectionString]);

   const handleGetReserveMetrics = async () => {
      if (!connectionString) {
         addToast('No reserve connection string found', 'error');
      }
      const metrics = await reserveMetrics(connectionString);
      setMetrics(metrics);
   };

   const handleConnect = async (nwc?: string) => {
      let valid = true;
      if (!nwc) {
         nwc = nwcUri;
      }
      const createMintPayload = {
         nwc,
         // mint_max_balance=random.randint(1, 1000),
         // mint_max_peg_in=random.randint(1, 1000),
         // mint_max_peg_out=random.randint(1, 1000),
         // mint_peg_out_only=random.choice([True, False]),
         mint_name: 'Boardwalk Reserve',
         mint_description: 'Reserve created on boardwalkcash.com',
         mint_description_long: 'This is a custom cashu mint that does not allow minting.',
      };

      const mintProviderUrl = process.env.NEXT_PUBLIC_MINT_PROVIDER_URL;

      // const authHeader = await generateNip98Header(
      //    `${mintProviderUrl}/user/mints`,
      //    'POST',
      //    undefined,
      // );
      const authHeader = '';

      try {
         const response = await fetch(`${mintProviderUrl}/user/mints`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               Authorization: authHeader,
            },
            body: JSON.stringify(createMintPayload),
         });

         if (!response.ok) {
            throw new Error('Failed to create mint');
         }

         const mintData = await response.json();

         console.log('Mint data:', mintData);
         console.log('## MINT URL:', `${mintProviderUrl}/${mintData.id}`);

         setFetchingMint(true);

         const url = `${mintProviderUrl}/${mintData.id}`;
         const mint = new CashuMint(url);

         const { keysets } = await mint.getKeys();

         const usdKeyset = keysets.find(keyset => keyset.unit === 'usd');

         if (!usdKeyset) {
            addToast("Mint doesn't support USD", 'error');
            return;
         }

         const createConnectionRes = await fetch(`${url}/nostr-mint-connect`, {
            headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
            method: 'POST',
         });

         if (!createConnectionRes.ok) {
            throw new Error('Failed to create connection');
         }

         const connectionData = await createConnectionRes.json();
         let token = connectionData.connectionToken;
         token = `${token}&mintUrl=${url}`;
         localStorage.setItem('reserve', token);
         setConnectionString(token);

         connectReserve(usdKeyset, url);

         setNwcUri('');

         addToast('Mint added successfully', 'success');
      } catch (e) {
         console.error(e);
         addToast(
            'Failed to add mint. Make sure the mint you are using supports Cashu V1',
            'error',
         );
      } finally {
         setFetchingMint(false);
      }
   };

   const handleMintEcash = useCallback(
      async (amount: number) => {
         if (mintingAmount !== undefined) {
            return;
         }
         if (!reserveWallet) {
            addToast('No reserve found', 'error');
            return;
         }

         setMintingAmount(amount);

         const { blindedMessages, secrets, rs } = createBlindedMessages(amount, reserveWallet.keys);

         try {
            const blindedSignatures = await requestSignatures(connectionString, blindedMessages);

            const proofs = constructProofs(blindedSignatures, rs, secrets, reserveWallet.keys);
            console.log('Proofs:', proofs);

            addProofs(proofs);

            const token = getEncodedTokenV4({
               token: [{ proofs: proofs, mint: reserveWallet.mint.mintUrl }],
            });

            dispatch(
               addTransaction({
                  type: 'reserve',
                  transaction: {
                     token,
                     amount,
                     date: new Date().toLocaleString(),
                     status: TxStatus.PAID,
                     unit: 'usd',
                     mint: reserveWallet.mint.mintUrl,
                     giftId: null,
                  },
               }),
            );
            dispatch(setSuccess(`Received $${(amount / 100).toFixed(2)}`));
            setMintingAmount(undefined);
            handleGetReserveMetrics().catch(e => console.error(e));
         } catch (e: any) {
            console.error(e);
            addToast(`Failed to mint ${e.message ? `- ${e.message}` : ''}`, 'error');
            setMintingAmount(undefined);
         }
      },
      [connectionString, reserveWallet, requestSignatures],
   );

   const handleDisconnect = () => {
      localStorage.removeItem('reserve');
      setConnectionString('');
      setKeysetNotReserve();
   };

   const mintAmounts = [
      { name: '1¢', value: 1 },
      { name: '5¢', value: 5 },
      { name: '$1', value: 100 },
      { name: '$5', value: 500 },
      { name: '$25', value: 2500 },
   ];

   return (
      <>
         {connected ? (
            <div className='mb-9 space-y-6'>
               <div className='flex justify-between mb-2'>
                  <div>
                     Connected{' '}
                     <span>
                        <button className='ml-2' onClick={() => setShowMetrics(!showMetrics)}>
                           {showMetrics ? (
                              <EyeSlashIcon className='size-4' />
                           ) : (
                              <EyeIcon className='size-4' />
                           )}
                        </button>
                     </span>{' '}
                  </div>
                  <Button size='xs' color={'failure'} onClick={handleDisconnect}>
                     Disconnect
                  </Button>
               </div>
               {showMetrics && (
                  <div className='text-sm'>
                     <div>
                        Wallet Balance:{' '}
                        {metrics.backend_balance && formatCents(metrics.backend_balance)}
                     </div>
                     <div>
                        Issued Tokens: {metrics.mint_balance && formatCents(metrics.mint_balance)}
                     </div>
                  </div>
               )}
               <div>
                  <h3 className='mb-9'>Tap to mint ecash</h3>
                  <div className='flex justify-around mb-4'>
                     {mintAmounts.map((tap, idx) => (
                        <div key={idx} className='flex items-center justify-center w-32'>
                           {' '}
                           {mintingAmount === tap.value ? (
                              <Spinner size='sm' className='flex items-center justify-center' />
                           ) : (
                              <button
                                 onClick={() => handleMintEcash(tap.value)}
                                 className='flex items-center justify-center w-full'
                              >
                                 <Badge color='dark'>{tap.name}</Badge>
                              </button>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         ) : (
            <ConnectReserve
               handleConnect={handleConnect}
               fetchingMint={fetchingMint}
               setNwcUri={setNwcUri}
               nwcUri={nwcUri}
            />
         )}
      </>
   );
};

export default ConnectWalletSetting;

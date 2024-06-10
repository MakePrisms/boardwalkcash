import { useCashu } from '@/hooks/useCashu';
import { useRemoteSigner } from '@/hooks/useRemoteMintSigner';
import { useToast } from '@/hooks/useToast';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { addKeyset, setBalance } from '@/redux/slices/Wallet.slice';
import { addBalance } from '@/utils/cashu';
import { createBlindedMessages } from '@/utils/crypto';
import { normalizeUrl } from '@/utils/url';
import { CashuMint, Proof, getEncodedToken } from '@cashu/cashu-ts';
import { constructProofs } from '@cashu/cashu-ts/dist/lib/es5/DHKE';
import { Badge, Button, Label, Spinner, TextInput } from 'flowbite-react';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

const ConnectWalletSetting = () => {
   const [connectionString, setConnectionString] = useState('');
   const [connected, setConnected] = useState(false);
   const [mintingAmount, setMintingAmount] = useState<undefined | number>();
   const [fetchingMint, setFetchingMint] = useState(false);

   const dispatch = useDispatch();
   const { requestSignatures } = useRemoteSigner();
   const { addToast } = useToast();
   const { reserveKeyset, setKeysetNotReserve } = useCashu();

   useEffect(() => {
      if (reserveKeyset !== null) {
         setConnected(true);
      } else {
         setConnected(false);
      }
   }, [reserveKeyset]);

   useEffect(() => {
      const timer = setTimeout(() => {
         if (mintingAmount !== undefined) {
            setMintingAmount(undefined);
         }
      }, 500);
      return () => {
         clearTimeout(timer);
      };
   }, [mintingAmount]);

   useEffect(() => {
      const reserve = localStorage.getItem('reserve');

      if (reserve) {
         setConnectionString(reserve);
         setConnected(true);
      } else {
         setConnected(false);
      }
   }, []);

   const handleConnect = async () => {
      console.log('Connect to', connectionString);

      let valid = true;

      if (!connectionString.trim().startsWith('bunker://')) {
         valid = false;
      }
      if (!connectionString.includes('secret')) {
         valid = false;
      }

      let mintUrl = connectionString.split('mintUrl=')[1];
      if (mintUrl.includes('&')) {
         mintUrl = mintUrl.split('&')[0];
      }

      console.log('mintUrl', mintUrl);

      if (mintUrl === undefined) {
         valid = false;
      }

      if (!valid) {
         addToast('Invalid connection string', 'error');
         return;
      }

      localStorage.setItem('reserve', connectionString);

      const url = normalizeUrl(mintUrl);
      const mint = new CashuMint(url);

      try {
         setFetchingMint(true);

         const { keysets } = await mint.getKeys();

         const usdKeyset = keysets.find(keyset => keyset.unit === 'usd');

         if (!usdKeyset) {
            addToast("Mint doesn't support USD", 'error');
            return;
         }

         dispatch(addKeyset({ keyset: usdKeyset, url, isReserve: true }));

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
         if (!reserveKeyset) {
            addToast('No reserve keyset found', 'error');
            return;
         } else {
            console.log('Reserve keyset:', reserveKeyset);
         }

         setMintingAmount(amount);

         const { blindedMessages, secrets, rs } = createBlindedMessages(
            amount,
            reserveKeyset.keys.id,
         );

         const blindedSignatures = await requestSignatures(connectionString, blindedMessages);

         const proofs = constructProofs(blindedSignatures, rs, secrets, reserveKeyset.keys);
         console.log('Proofs:', proofs);

         addBalance(proofs);

         const newProofs = JSON.parse(window.localStorage.getItem('proofs') || '[]') as Proof[];
         const newBalance = newProofs.reduce((acc: number, proof: any) => acc + proof.amount, 0);

         dispatch(setBalance({ usd: newBalance }));

         const token = getEncodedToken({ token: [{ proofs: proofs, mint: reserveKeyset.url }] });

         dispatch(
            addTransaction({
               type: 'reserve',
               transaction: {
                  token,
                  amount,
                  date: new Date().toLocaleString(),
                  status: TxStatus.PAID,
                  unit: 'usd',
                  mint: reserveKeyset.url,
               },
            }),
         );
      },
      [connectionString, reserveKeyset, requestSignatures],
   );

   const handleDisconnect = () => {
      localStorage.removeItem('reserve');
      setConnectionString('');
      setKeysetNotReserve();
   };

   const mintAmounts = [
      { name: '1 ¢', value: 1 },
      { name: '5 ¢', value: 5 },
      { name: '$1', value: 100 },
      { name: '$5', value: 500 },
      { name: '$25', value: 2500 },
   ];

   return (
      <>
         {connected ? (
            <div>
               <div className='flex justify-between mb-2'>
                  <div>Connected &#x2705;</div>
                  <Button size='xs' color={'failure'} onClick={handleDisconnect}>
                     Disconnect
                  </Button>
               </div>
               <div>
                  <h3 className='mb-3'>Tap to mint ecash</h3>
                  <div className='flex justify-around mb-4'>
                     {mintAmounts.map((tap, idx) => (
                        <div key={idx} className='flex items-center justify-center w-32'>
                           {' '}
                           {/* Set width to match the largest content */}
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
            <form className='flex flex-col justify-around mb-5'>
               <div>
                  <Label className='text-white'>
                     Connect a Reserve at{' '}
                     <a
                        className='underline text-cyan-teal'
                        target='_blank'
                        href='https://pierreserve.com'
                     >
                        PierReserve.com
                     </a>
                  </Label>
                  <TextInput
                     placeholder='Enter a reserve key...'
                     onChange={e => setConnectionString(e.target.value)}
                     value={connectionString}
                  />
               </div>
               <div>
                  <Button
                     className='mt-2 max-w-fit self-end bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none'
                     onClick={handleConnect}
                     isProcessing={fetchingMint}
                  >
                     Connect
                  </Button>
               </div>
            </form>
         )}
      </>
   );
};

export default ConnectWalletSetting;

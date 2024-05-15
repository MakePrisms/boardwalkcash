import { RootState, useAppDispatch } from '@/redux/store';
import { CashuMint, CashuWallet, Proof, Token } from '@cashu/cashu-ts';
import { Modal, Spinner } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import SwapToMainButton from '../sidebar/SwapToMainButton';
import { useCashu } from '@/hooks/useCashu';
import { addKeyset } from '@/redux/slices/Wallet.slice';
import { useToast } from '@/hooks/useToast';
import ProcessingSwapModal from '../sidebar/ProcessingSwapModal';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface ConfirmEcashReceiveModalProps {
   isOpen: boolean;
   token: Token | null;
   onClose: () => void;
}

const ConfirmEcashReceiveModal = ({ isOpen, token, onClose }: ConfirmEcashReceiveModalProps) => {
   const [mintTrusted, setMintTrusted] = useState(false);
   const [swapToMainOpen, setSwapToMainOpen] = useState(false);
   const [swapping, setSwapping] = useState(false);
   const wallet = useSelector((state: RootState) => state.wallet);
   const [loadingUnits, setLoadingUnits] = useState(true);
   const [supportedUnits, setSupportedUnits] = useState<string[]>([]);
   const [mintUrl, setMintUrl] = useState<string>('');
   const [proofs, setProofs] = useState<Proof[]>([]);
   const [tokenUnit, setTokenUnit] = useState<string | null>(null);
   const [fromActiveMint, setFromActiveMint] = useState(true);
   const [amountUsd, setAmountUsd] = useState<number | null>(null);

   const dispatch = useAppDispatch();

   const { swapToMain, fetchUnitFromProofs } = useCashu();
   const { addToast } = useToast();
   const { satsToUnit } = useExchangeRate();

   const handleSwapToMain = async () => {
      console.log('Swapping to main mint');
      console.log('Token', token);
      if (!token) return null;
      if (!tokenUnit) throw new Error('Token unit is not set');

      setSwapping(true);

      await swapToMain(
         { unit: tokenUnit, id: tokens[0].proofs[0].id, url: tokens[0].mint },
         tokens[0].proofs,
      )
         .catch(() => {
            addToast('Failed to swap to main mint', 'error');
         })
         .finally(() => {
            setSwapToMainOpen(false);
            onClose();
            setSwapping(false);
         });
   };

   useEffect(() => {
      const tokenMint = token?.token[0].mint;

      if (!tokenMint) return;

      const walletMints = Object.values(wallet.keysets).map(keyset => keyset.url);

      console.log('Wallet Mints', walletMints);
      console.log('Token Mint', tokenMint);

      setMintTrusted(walletMints.includes(tokenMint));
   }, [wallet, token]);

   useEffect(() => {
      if (!token?.token[0].mint) return;

      if (token?.token.length > 1) {
         alert(
            'Received a token with more than one mint. This is not supported yet. Please report this.',
         );
         throw new Error(
            'Received a token with more than one mint. This is not supported yet. Please report this.',
         );
      }

      setMintUrl(token.token[0].mint);
      setProofs(token.token[0].proofs);
   }, [token]);

   useEffect(() => {
      if (!mintUrl) return;
      const activeWallet = Object.values(wallet.keysets).find(w => w.active);

      if (mintUrl === activeWallet?.url) {
         setFromActiveMint(true);
      } else {
         setFromActiveMint(false);
      }

      setLoadingUnits(true);

      const mint = new CashuMint(mintUrl);

      new CashuWallet(mint).checkProofsSpent(proofs).then(spent => {
         if (spent.length > 0) {
            addToast('Proofs already claimed', 'error');
            onClose();
         }
      });

      mint.getKeys().then(({ keysets }) => {
         const units = new Set<string>();
         keysets.forEach(keyset => units.add(keyset.unit));

         setSupportedUnits(Array.from(units));
      });

      fetchUnitFromProofs(mintUrl, proofs)
         .then(unit => {
            setTokenUnit(unit);

            return unit;
         })
         .then(async unit => {
            const unitTotal = proofs.reduce((acc, proof) => (acc += proof.amount), 0);
            if (unit === 'sat') {
               await satsToUnit(unitTotal, 'usd').then(usdAmount =>
                  setAmountUsd(parseFloat((usdAmount / 100).toFixed(2))),
               );
            } else {
               setAmountUsd(parseFloat((unitTotal / 100).toFixed(2)));
            }
         })
         .finally(() => setLoadingUnits(false));
   }, [mintUrl, proofs]);

   if (!token) return null;

   const { token: tokens } = token;

   if (tokens.length > 1) {
      alert(
         'Received a token with more than one mint. This is not supported yet. Please report this.',
      );
      throw new Error(
         'Received a token with more than one mint. This is not supported yet. Please report this.',
      );
   }

   const handleAddMint = async () => {
      console.log('Adding mint', mintUrl);
      try {
         const swapFromMint = new CashuMint(mintUrl);
         const { keysets } = await swapFromMint.getKeys();
         const activeWallet = Object.values(wallet.keysets).find(w => w.active);

         if (!activeWallet) {
            addToast('No active wallet found', 'error');
            return;
         }

         setSwapping(true);

         const usdKeyset = keysets.find(keyset => keyset.unit === 'usd');

         if (!usdKeyset) {
            addToast("Mint doesn't support USD", 'error');
            return;
         }

         console.log('Tokens keysetId', usdKeyset.id);

         // this means we haven't added the mint yet
         if (!mintTrusted) {
            console.log("Mint isn't trusted. Adding it: ", mintUrl);
            dispatch(addKeyset({ keyset: usdKeyset, url: mintUrl }));

            addToast('Mint added successfully', 'success');
         }

         console.log('Swapping');

         console.log('Active Wallet', activeWallet);

         await swapToMain(
            { unit: tokenUnit!, id: proofs[0].id, url: mintUrl },
            proofs,
            new CashuWallet(swapFromMint, { unit: tokenUnit! }), // swap from
            new CashuWallet(swapFromMint, { unit: 'usd', keys: usdKeyset }), // swap to
         );

         onClose();
      } catch (e) {
         console.error(e);
         addToast(
            'Failed to add mint. Make sure the mint you are using supports Cashu V1',
            'error',
         );
      } finally {
         setSwapping(false);
      }
   };

   const receiveAmountString = () => {
      const symbol = tokenUnit !== 'usd' ? '~' : '';
      const total = amountUsd;
      return `${symbol}$${total?.toFixed(2)}`;
   };

   if (loadingUnits) {
      return (
         <Modal show={isOpen} onClose={onClose}>
            <Modal.Header>Confirm Ecash Receive</Modal.Header>
            <Modal.Body>
               <div className='flex flex-col space-y-4 justify-center items-center'>
                  <Spinner size='xl' />
               </div>
            </Modal.Body>
         </Modal>
      );
   }

   return (
      <>
         <Modal show={isOpen} onClose={onClose}>
            <Modal.Header>Confirm Ecash Receive</Modal.Header>

            <Modal.Body className='text-black'>
               <h3 className='text-5xl text-center mb-4'>{receiveAmountString()}</h3>
               <div className='space-y-4'>
                  <div className='flex flex-row justify-center mb-4'>
                     <p className='text-center text-sm mb-2 mr-3'>
                        <a
                           href={`https://bitcoinmints.com/?tab=reviews&mintUrl=${encodeURIComponent(mintUrl)}`}
                           target='_blank'
                           className=' underline'
                        >
                           View Reviews
                        </a>
                     </p>
                     <p className='text-center mb-2 text-sm'>
                        {mintTrusted ? (
                           <span className='text-green-500'>Trusted</span>
                        ) : (
                           <span className='text-red-500'>Not Trusted</span>
                        )}
                     </p>
                  </div>

                  <div className='flex flex-col md:flex-row md:justify-center justify-center items-center'>
                     <button onClick={handleSwapToMain} className='mr-3 underline text-lg mb-0'>
                        {fromActiveMint ? 'Claim' : 'Swap to Main'}
                     </button>
                     <button
                        className={`underline hover:cursor-pointer text-lg mb-0 ${fromActiveMint ? 'hidden' : ''} ${!supportedUnits.includes('usd') && 'hidden'}`}
                        onClick={handleAddMint}
                     >
                        {mintTrusted ? 'Claim to Source Mint' : 'Trust Mint and Claim'}
                     </button>
                  </div>
               </div>
            </Modal.Body>
         </Modal>
         <ProcessingSwapModal isSwapping={swapping} />
      </>
   );
};

export default ConfirmEcashReceiveModal;

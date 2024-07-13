import { RootState, useAppDispatch } from '@/redux/store';
import { CashuMint, CashuWallet, MintKeys, Proof, Token, getEncodedToken } from '@cashu/cashu-ts';
import { Modal, Spinner } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import SwapToMainButton from '../sidebar/SwapToMainButton';
import { useCashu } from '@/hooks/useCashu';
import { addKeyset } from '@/redux/slices/Wallet.slice';
import { useToast } from '@/hooks/useToast';
import ProcessingSwapModal from '../sidebar/ProcessingSwapModal';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useCashu2 } from '@/hooks/useCashu2';

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

   const { fetchUnitFromProofs } = useCashu();
   const { getMint, getWallet, swapToClaimProofs, swapToActiveWallet } = useCashu2();
   const { addToast } = useToast();
   const { satsToUnit } = useExchangeRate();

   const addEcashTransaction = (status: TxStatus) => {
      if (!token) return;
      if (!amountUsd) return;
      dispatch(
         addTransaction({
            type: 'ecash',
            transaction: {
               token: getEncodedToken(token),
               amount: amountUsd * 100,
               mint: mintUrl,
               date: new Date().toLocaleString(),
               status,
               unit: 'usd',
            },
         }),
      );
   };

   const handleSwapToMain = async () => {
      console.log('Swapping to main mint');
      console.log('Token', token);
      if (!token) return null;
      if (!tokenUnit) throw new Error('Token unit is not set');

      setSwapping(true);

      const swapFromMint = getMint(mintUrl) || new CashuMint(mintUrl);
      const usdKeyset = await getUsdKeyset(swapFromMint);

      await swapToActiveWallet(
         new CashuWallet(swapFromMint, { unit: tokenUnit, keys: usdKeyset }),
         { proofs },
      );

      addEcashTransaction(TxStatus.PAID);
      setSwapToMainOpen(false);
      onClose();
      setSwapping(false);
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

   const getUsdKeyset = async (mint: CashuMint) => {
      let keysets: MintKeys[] = [];
      try {
         const res = await mint.getKeys();
         keysets = res.keysets;
      } catch (e: any) {
         let errMsg = '';
         if (e.detail || e.error) {
            errMsg = e.detail || e.error;
         }
         addToast(`Failed to get keys from ${mint.mintUrl}: ${errMsg}`, 'error');
         return;
      }

      const usdKeyset = keysets.find(keyset => keyset.unit === 'usd');

      if (!usdKeyset) {
         addToast("Mint doesn't support USD", 'error');
         return;
      }

      return usdKeyset;
   };

   const addUsdKeysetAndGetWallet = async (url: string) => {
      const swapFromMint = getMint(url) || new CashuMint(url);
      const usdKeyset = await getUsdKeyset(swapFromMint);

      if (!usdKeyset) {
         addToast("Mint doesn't support USD", 'error');
         return;
      }

      // this means we haven't added the mint yet
      if (!mintTrusted) {
         console.log("Mint isn't trusted. Adding it: ", url);
         dispatch(addKeyset({ keyset: usdKeyset, url: url }));

         addToast('Mint added successfully', 'success');
      }

      return new CashuWallet(swapFromMint, { unit: 'usd', keys: usdKeyset });
   };

   // trust and claim or claim to source mint
   const handleAddMint = async () => {
      console.log('Adding mint', mintUrl);
      let wallet = getWallet(proofs[0].id);

      // if we don't have the wallet, make sure it supports usd, then add keyset
      if (!wallet) {
         wallet = await addUsdKeysetAndGetWallet(mintUrl);
         if (!wallet) {
            return;
         }
      }
      console.log('Swapping');

      await swapToClaimProofs(wallet, proofs);

      // TOOD: move to cashu2
      addEcashTransaction(TxStatus.PAID);

      onClose();
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

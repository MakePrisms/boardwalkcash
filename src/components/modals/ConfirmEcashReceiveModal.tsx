import { RootState, useAppDispatch } from '@/redux/store';
import { CashuMint, CashuWallet, MintActiveKeys, Token } from '@cashu/cashu-ts';
import { Modal } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import SwapToMainButton from '../sidebar/SwapToMainButton';
import { useCashu } from '@/hooks/useCashu';
import { addKeyset } from '@/redux/slices/Wallet.slice';
import { useToast } from '@/hooks/useToast';

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
   const [supportedUnits, setSupportedUnits] = useState<string[]>([]);

   const dispatch = useAppDispatch();

   const { swapToMain } = useCashu();
   const { addToast } = useToast();

   const handleSwapToMain = () => {
      if (!token) return null;

      const { token: tokens, unit } = token;

      if (!unit) return;

      setSwapping(true);

      setSwapToMainOpen(false);

      swapToMain(
         { unit, id: tokens[0].proofs[0].id, url: tokens[0].mint },
         tokens[0].proofs,
      ).finally(() => {
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
      const mintUrl = token?.token[0].mint;

      if (!mintUrl) return;

      new CashuMint(mintUrl).getKeys().then((keys: MintActiveKeys) => {
         const units = new Set<string>();
         keys.keysets.forEach(keyset => units.add(keyset.unit));

         setSupportedUnits(Array.from(units));
      });
   }, [token]);

   if (!token) return null;

   const { token: tokens, unit } = token;

   if (tokens.length > 1) {
      alert(
         'Received a token with more than one mint. This is not supported yet. Please report this.',
      );
      throw new Error(
         'Received a token with more than one mint. This is not supported yet. Please report this.',
      );
   }

   const { proofs, mint: mintUrl } = tokens[0];

   const handleAddMint = async () => {
      try {
         const swapFromMint = new CashuMint(mintUrl);
         const { keysets } = await swapFromMint.getKeys();

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

         const activeWallet = Object.values(wallet.keysets).find(w => w.active);

         if (!activeWallet) {
            addToast('No active wallet found', 'error');
            return;
         }

         console.log('Active Wallet', activeWallet);

         const swapToMint = new CashuMint(activeWallet.url);

         await swapToMain(
            { unit: unit!, id: proofs[0].id, url: mintUrl },
            proofs,
            new CashuWallet(swapFromMint, { unit: unit! }), // swap from
            new CashuWallet(swapFromMint, { unit: 'usd', keys: usdKeyset }), // swap to
         );

         onClose();
      } catch (e) {
         console.error(e);
         addToast(
            'Failed to add mint. Make sure the mint you are using supports Cashu V1',
            'error',
         );
      }
   };

   return (
      <Modal show={isOpen} onClose={onClose}>
         <Modal.Header>Confirm Ecash Receive</Modal.Header>

         <Modal.Body className='text-black'>
            <div>
               <p>Mint Url: {mintUrl}</p>
               <p>
                  {mintTrusted ? (
                     <span className='text-green-500'>Trusted</span>
                  ) : (
                     <span className='text-red-500'>Not Trusted</span>
                  )}
               </p>
               <p>Supported Units: {supportedUnits.join(', ')}</p>
               <p>
                  Boarwalk cash supports this mint?{' '}
                  {supportedUnits.includes('usd') ? (
                     <span className='text-green-500'>Yes</span>
                  ) : (
                     <span className='text-red-500'>No</span>
                  )}
               </p>
               <SwapToMainButton
                  swapToMainOpen={swapToMainOpen}
                  mintUrl={mintUrl}
                  setSwapToMainOpen={setSwapToMainOpen}
                  handleSwapToMain={handleSwapToMain}
               />
               <button className='underline hover:cursor-pointer text-xs' onClick={handleAddMint}>
                  Add mint and claim tokens
               </button>
            </div>
            <div>
               <p>Unit: {unit}</p>
            </div>
            <div>
               <p>Total: {proofs.reduce((acc, proof) => (acc += proof.amount), 0)}</p>
            </div>
         </Modal.Body>
      </Modal>
   );
};

export default ConfirmEcashReceiveModal;

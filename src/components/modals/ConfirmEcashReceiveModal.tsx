import { RootState, useAppDispatch } from '@/redux/store';
import { CashuMint, CashuWallet, MintKeys, Proof, Token, getEncodedToken } from '@cashu/cashu-ts';
import { Button, Modal, Spinner } from 'flowbite-react';
import Tooltip from '@/components/Toolttip';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useProofManager } from '@/hooks/cashu/useProofManager.ts';
import { useToast } from '@/hooks/util/useToast';
import ProcessingClaimModal from './ProcessingCashuSwap/ProcessingClaim';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { AlreadyClaimedError, GiftAsset, PublicContact } from '@/types';
import useContacts from '@/hooks/boardwalk/useContacts';
import StickerItem from '../eGifts/stickers/StickerItem';
import { formatCents } from '@/utils/formatting';
import { isTokenSpent } from '@/utils/cashu';
import useGifts from '@/hooks/boardwalk/useGifts';

interface ConfirmEcashReceiveModalProps {
   isOpen: boolean;
   token: Token;
   onClose: () => void;
   onSuccess?: () => void;
   contact?: PublicContact;
}

const ConfirmEcashReceiveModal = ({
   isOpen,
   token,
   onClose,
   onSuccess,
   contact,
}: ConfirmEcashReceiveModalProps) => {
   const [mintTrusted, setMintTrusted] = useState(false);
   const [swapping, setSwapping] = useState(false);
   const wallet = useSelector((state: RootState) => state.wallet);
   const [mintUrl, setMintUrl] = useState<string>('');
   const [proofs, setProofs] = useState<Proof[]>([]);
   const [tokenUnit, setTokenUnit] = useState<string | null>(null);
   const [fromActiveMint, setFromActiveMint] = useState(true);
   const [amountUsd, setAmountUsd] = useState<number | null>(null);
   const [lockedTo, setLockedTo] = useState<string | null>(null);
   const user = useSelector((state: RootState) => state.user);
   const [tokenContact, setTokenContact] = useState<PublicContact | null>(null);
   const [gift, setGift] = useState<GiftAsset | null>(null);
   const [loading, setLoading] = useState(true);
   const [disableClaim, setDisableClaim] = useState(false);
   const [alreadyClaimed, setAlreadyClaimed] = useState(false);

   const dispatch = useAppDispatch();

   const { fetchUnitFromProofs } = useProofManager();
   const { getMint, getWallet, swapToClaimProofs, swapToActiveWallet, proofsLockedTo } = useCashu();
   const { addWallet, activeWallet, isMintTrusted } = useCashuContext();
   const { addToast } = useToast();
   const { fetchContact } = useContacts();
   const { getGiftFromToken } = useGifts();

   const addEcashTransaction = useCallback(
      (status: TxStatus) => {
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
                  gift: gift?.name,
               },
            }),
         );
      },
      [dispatch, token, amountUsd, mintUrl, gift],
   );

   useEffect(() => {
      if (!isOpen) return;
      const loadTokenDetails = async (token: Token) => {
         if (token?.token.length > 1) {
            alert(
               'Received a token with more than one mint. This is not supported yet. Please report this.',
            );
            throw new Error(
               'Received a token with more than one mint. This is not supported yet. Please report this.',
            );
         }

         const { mint: mintUrl, proofs } = token.token[0];

         // set the pubkey that the token is locked to
         const pubkeyLock = proofsLockedTo(proofs);
         setLockedTo(pubkeyLock);

         if (contact) {
            setTokenContact(contact);
         } else if (pubkeyLock) {
            // fetch contact if not passed to the component
            const contact = await fetchContact(pubkeyLock.slice(2));
            setTokenContact(contact || null);
         }

         setMintUrl(mintUrl);
         setProofs(proofs);
         setMintTrusted(isMintTrusted(mintUrl));
         const isActiveMint = mintUrl === activeWallet?.mint.mintUrl;
         setFromActiveMint(isActiveMint);
         if (
            !isActiveMint &&
            (mintUrl.includes('test') || activeWallet?.mint.mintUrl.includes('test'))
         ) {
            // disable if trying to swap to or from test mints
            setDisableClaim(true);
         }
         if (await isTokenSpent(token)) {
            /* stop loading so /wallet page shows the ecash still */
            setLoading(false);
            throw new AlreadyClaimedError();
         }
         const proofsUnit = await fetchUnitFromProofs(mintUrl, proofs);
         setTokenUnit(proofsUnit);
         if (proofsUnit !== 'usd') {
            throw new Error('Can only receive eCash in USD');
         }
         const unitTotal = proofs.reduce((acc, proof) => (acc += proof.amount), 0);
         setAmountUsd(parseFloat((unitTotal / 100).toFixed(2)));
      };

      const loadGift = async () => {
         if (!token) return;
         try {
            const gift = await getGiftFromToken(token);
            setGift(gift);
         } catch (e: any) {
            if (e.message === 'Not found') {
               setGift(null);
            } else {
               throw e;
            }
         }
      };

      const load = async (token: Token) => {
         try {
            await Promise.all([loadTokenDetails(token), loadGift()]);
            setLoading(false);
         } catch (e: any) {
            if (e.message) {
               addToast(e.message, 'error');
            } else {
               addToast('Failed to load token', 'error');
            }
            if (e instanceof AlreadyClaimedError) {
               setAlreadyClaimed(true);
               // Check if this is a gift after both promises have resolved
               const isGift = await getGiftFromToken(token).catch(() => null);
               if (isGift) {
                  setLoading(false);
                  return; // Don't close the modal for claimed gifts
               }
            }

            onClose();
         }
      };

      if (!token) return;
      if (!isOpen) return;
      load(token);
   }, [token, activeWallet, contact, wallet, isOpen, isMintTrusted]);

   const handleSwapToMain = async () => {
      console.log('Swapping to main mint');
      console.log('Token', token);
      if (!token) return null;
      if (!tokenUnit) throw new Error('Token unit is not set');

      /* Opens swap modal */
      setSwapping(true);
      /* Closes main modal, keeps swap modal open */
      onClose();

      const swapFromMint = getMint(mintUrl) || new CashuMint(mintUrl);
      const usdKeyset = await getUsdKeyset(swapFromMint);

      let privkey = lockedTo ? user.privkey : undefined;

      const success = await swapToActiveWallet(
         new CashuWallet(swapFromMint, { unit: tokenUnit, keys: usdKeyset }),
         { proofs, privkey },
      ).finally(() => setSwapping(false)); /* Closes swap modal */

      addEcashTransaction(TxStatus.PAID);

      if (onSuccess && success) {
         onSuccess();
      }
   };

   const title = useMemo(() => {
      const forText = tokenContact?.username ? `for ${tokenContact.username}` : '';
      if (gift) {
         return `eGift ${forText}`;
      } else if (lockedTo) {
         return `eTip ${forText}`;
      }
      return 'Confirm Ecash Receive';
   }, [lockedTo, gift, tokenContact]);

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
         addWallet(usdKeyset, url);
         addToast('Mint added successfully', 'success');
      }

      return new CashuWallet(swapFromMint, { unit: 'usd', keys: usdKeyset });
   };

   /* trust and claim or claim to source mint */
   const handleAddMint = async () => {
      console.log('Adding mint', mintUrl);
      let wallet = getWallet(proofs[0].id);

      /* if we don't have the wallet, make sure it supports usd, then add keyset */
      if (!wallet) {
         wallet = await addUsdKeysetAndGetWallet(mintUrl);
         if (!wallet) {
            return;
         }
      }
      console.log('Swapping');

      const privkey = lockedTo ? user.privkey : undefined;
      const success = await swapToClaimProofs(wallet, proofs, { privkey });

      // TOOD: move to cashu2
      addEcashTransaction(TxStatus.PAID);

      onClose();

      if (onSuccess && success) {
         onSuccess();
      }
   };

   const receiveAmountString = () => {
      const symbol = tokenUnit !== 'usd' ? '~' : '';
      const total = amountUsd;
      return `${symbol}$${total?.toFixed(2)}`;
   };

   if (loading) {
      return (
         <Modal show={isOpen} onClose={onClose}>
            <Modal.Header>Loading...</Modal.Header>
            <Modal.Body>
               <div className='flex flex-col space-y-4 justify-center items-center'>
                  <Spinner size='xl' />
               </div>
            </Modal.Body>
         </Modal>
      );
   }

   const handleCopy = () => {
      try {
         navigator.clipboard.writeText(getEncodedToken(token));
         addToast('Copied to clipboard', 'info');
      } catch (e) {
         addToast('Failed to copy to clipboard', 'error');
      }
   };

   return (
      <>
         <Modal show={isOpen} onClose={onClose}>
            <Modal.Header>{title}</Modal.Header>

            <Modal.Body className='text-black flex flex-col gap-6 justify-center items-center'>
               <Tooltip content='Copy token'>
                  <div className='hover:cursor-pointer' onClick={handleCopy}>
                     {gift ? (
                        <div className='flex flex-row justify-center'>
                           <StickerItem
                              selectedSrc={gift.selectedSrc}
                              unselectedSrc={gift.unselectedSrc}
                              isSelected={true}
                              alt={formatCents(gift.amountCents)}
                              size='lg'
                           />
                        </div>
                     ) : (
                        <h3 className='text-5xl text-center'>{receiveAmountString()}</h3>
                     )}
                  </div>
               </Tooltip>
               <div className='space-y-4'>
                  <div className='flex flex-row justify-center'>
                     <p className='text-center text-sm'>
                        <a
                           href={`https://bitcoinmints.com/?tab=reviews&mintUrl=${encodeURIComponent(mintUrl)}`}
                           target='_blank'
                           className=' '
                        >
                           {mintTrusted ? (
                              <span className='text-green-500 underline'>Trusted</span>
                           ) : (
                              <span className='text-red-500 underline'>Not Trusted</span>
                           )}
                        </a>
                     </p>
                  </div>
               </div>
               {!alreadyClaimed && (
                  <div className='flex flex-col gap-2 justify-center items-center'>
                     {!lockedTo || lockedTo === '02' + user.pubkey ? (
                        /* wrap in tooltip when disabled to show message */
                        disableClaim ? (
                           <Tooltip content='testnut'>
                              <span>
                                 <Button
                                    disabled={disableClaim}
                                    onClick={handleSwapToMain}
                                    className='btn-primary w-36'
                                 >
                                    Claim
                                 </Button>
                              </span>
                           </Tooltip>
                        ) : (
                           <Button
                              disabled={false}
                              onClick={handleSwapToMain}
                              className='btn-primary w-36'
                           >
                              Claim
                           </Button>
                        )
                     ) : (
                        <div className='text-center text-lg text-red-700'>
                           {gift ? 'eGift' : 'eTip'}{' '}
                           {tokenContact ? (
                              <span className=''>
                                 for{' '}
                                 <a
                                    className='underline'
                                    target='_blank'
                                    href={`/${tokenContact.username}`}
                                 >
                                    {tokenContact.username}
                                 </a>
                              </span>
                           ) : (
                              ''
                           )}
                        </div>
                     )}
                  </div>
               )}
               {!alreadyClaimed &&
                  !fromActiveMint &&
                  (!lockedTo || lockedTo === '02' + user.pubkey) && (
                     <Button
                        className={`btn-primary xss-button !p-0 ${mintTrusted ? 'w-30' : 'w-28'}`}
                        onClick={handleAddMint}
                        size={'xs'}
                        theme={{ size: { xs: 'px-2 py-1 text-xxs' } }}
                     >
                        {mintTrusted ? 'Claim (Source Mint)' : 'Trust and Claim'}
                     </Button>
                  )}
            </Modal.Body>
         </Modal>
         <ProcessingClaimModal isSwapping={swapping} />
      </>
   );
};

export default ConfirmEcashReceiveModal;

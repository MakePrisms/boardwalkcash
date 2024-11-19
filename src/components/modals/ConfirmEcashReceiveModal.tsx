import { RootState, useAppDispatch } from '@/redux/store';
import { Proof, Token, getEncodedTokenV4 } from '@cashu/cashu-ts';
import { Button, Modal, Spinner } from 'flowbite-react';
import Tooltip from '@/components/utility/Tooltip';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useToast } from '@/hooks/util/useToast';
import ProcessingClaimModal from './ProcessingCashuSwap/ProcessingClaim';
import { TxStatus, addTransaction } from '@/redux/slices/HistorySlice';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { AlreadyClaimedError, Currency, GiftAsset, PublicContact } from '@/types';
import useContacts from '@/hooks/boardwalk/useContacts';
import StickerItem from '../eGifts/stickers/StickerItem';
import { formatSats, formatUnit } from '@/utils/formatting';
import { initializeWallet, isTokenSpent } from '@/utils/cashu';
import useGifts from '@/hooks/boardwalk/useGifts';
import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';

interface ConfirmEcashReceiveModalProps {
   isOpen: boolean;
   token: Token;
   onClose: () => void;
   onSuccess?: () => void;
   contact?: PublicContact;
   isUserInitialized: boolean;
}

const ConfirmEcashReceiveModal = ({
   isOpen,
   token,
   onClose,
   onSuccess,
   contact,
   isUserInitialized,
}: ConfirmEcashReceiveModalProps) => {
   const [mintTrusted, setMintTrusted] = useState(false);
   const [swapping, setSwapping] = useState(false);
   const wallet = useSelector((state: RootState) => state.wallet);
   const [mintUrl, setMintUrl] = useState<string>('');
   const [proofs, setProofs] = useState<Proof[]>([]);
   const [tokenUnit, setTokenUnit] = useState<'usd' | 'sat' | null>(null);
   const [fromActiveMint, setFromActiveMint] = useState(true);
   const [amountUnit, setAmountUnit] = useState<number | null>(null);
   const [lockedTo, setLockedTo] = useState<string | null>(null);
   const user = useSelector((state: RootState) => state.user);
   const [tokenContact, setTokenContact] = useState<PublicContact | null>(null);
   const [gift, setGift] = useState<GiftAsset | null>(null);
   const [loading, setLoading] = useState(true);
   const [disableClaim, setDisableClaim] = useState(false);
   const [alreadyClaimed, setAlreadyClaimed] = useState(false);

   const { swapToClaimProofs, swapToActiveWallet, proofsLockedTo } = useCashu();
   const { addWalletFromMintUrl, activeWallet, isMintTrusted, getWallet } = useCashuContext();
   const { addToast } = useToast();
   const { fetchContact } = useContacts();
   const { getGiftFromToken } = useGifts();
   const { mintlessClaimToken } = useMintlessMode();

   const handleModalClose = () => {
      setMintTrusted(false);
      setSwapping(false);
      setMintUrl('');
      setProofs([]);
      setTokenUnit(null);
      setFromActiveMint(true);
      setAmountUnit(null);
      setLockedTo(null);
      setTokenContact(null);
      setGift(null);
      setLoading(true);
      setDisableClaim(false);
      setAlreadyClaimed(false);
      onClose();
   };

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
         setTokenUnit((token.unit as Currency) || Currency.SAT);
         // if (proofsUnit !== 'usd') {
         //    throw new Error('Can only receive eCash in USD');
         // }
         const unitTotal = proofs.reduce((acc, proof) => (acc += proof.amount), 0);
         setAmountUnit(unitTotal);
         // setAmountUsd(parseFloat((unitTotal / 100).toFixed(2)));
         if (await isTokenSpent(token)) {
            /* stop loading so /wallet page shows the ecash still */
            setLoading(false);
            throw new AlreadyClaimedError();
         }
      };

      const loadGift = async () => {
         if (!token) return;
         try {
            const gift = await getGiftFromToken(token);
            setGift(gift);
         } catch (e: any) {
            if (e.message === 'Not Found') {
               setGift(null);
            } else {
               console.error('Failed to load gift', e);
               // throw e;
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
               console.error('Failed to load token', e);
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

            handleModalClose();
         }
      };

      if (!token) return;
      if (!isOpen) return;
      load(token);
   }, [token, activeWallet, contact, wallet, isOpen, isMintTrusted]);

   const handleMintlessReceive = async () => {
      if (!mintUrl) throw new Error('No mint url found');
      if (!tokenUnit) throw new Error('Token unit is not set');
      if (!user.lud16) throw new Error('No lud16 found');

      /* Opens swap modal */
      setSwapping(true);

      /* Closes main modal, keeps swap modal open */
      onClose();

      let privkey: string | undefined;
      if (lockedTo) {
         privkey = user.privkey;
      }

      const wallet = await initializeWallet(mintUrl, { unit: tokenUnit });

      try {
         const { amountMeltedSat } = await mintlessClaimToken(wallet, token, {
            privkey,
         });
         if (!amountMeltedSat) throw new Error('Failed to claim token');
         addToast(`Claimed ${formatSats(amountMeltedSat)} to Lightning Wallet`, 'success');
      } catch (error: any) {
         console.error('Error claiming token:', error);
         const msg = error.message || 'Failed to claim token';
         addToast(msg, 'error');
      } finally {
         setSwapping(false);
      }
   };

   const handleSwapToMain = async () => {
      console.log('Swapping to main mint');
      console.log('Token', token);
      if (!token) return null;
      if (!tokenUnit) throw new Error('Token unit is not set');

      /* Opens swap modal */
      setSwapping(true);
      /* Closes main modal, keeps swap modal open */
      onClose();

      let wallet = getWallet(proofs[0].id);
      if (!wallet) {
         wallet = await initializeWallet(mintUrl, { unit: tokenUnit });
         if (!wallet) {
            return;
         }
      }

      let privkey = lockedTo ? user.privkey : undefined;

      const success = await swapToActiveWallet(wallet, {
         proofs,
         privkey,
      }).finally(() => setSwapping(false)); /* Closes swap modal */

      if (success) {
         onSuccess?.();
      }
   };

   /* trust and claim or claim to source mint */
   const handleAddMint = async () => {
      if (!mintUrl) throw new Error('No mint url found');
      if (!tokenUnit) throw new Error('No token unit found');

      console.log('Adding mint', mintUrl);
      let wallet = getWallet(proofs[0].id);

      if (!wallet) {
         wallet = await initializeWallet(mintUrl, { unit: tokenUnit });
         await addWalletFromMintUrl(mintUrl, undefined);

         if (!wallet) {
            return;
         }
      }
      console.log('Swapping');

      const privkey = lockedTo ? user.privkey : undefined;
      const success = await swapToClaimProofs(wallet, proofs, { privkey });

      handleModalClose();

      if (success) {
         onSuccess?.();
      }
   };

   const receiveAmountString = () => {
      if (!amountUnit || !tokenUnit) return '';
      return formatUnit(amountUnit, tokenUnit);
   };

   const title = useMemo(() => {
      const contactText = tokenContact?.username ? (
         <>
            {contact !== undefined ? 'from' : 'for'}{' '}
            <a className='underline' target='_blank' href={`/${tokenContact.username}`}>
               {tokenContact.username}
            </a>
         </>
      ) : (
         ''
      );
      if (gift) {
         return <>eGift {contactText}</>;
      } else if (lockedTo) {
         return <>eTip {contactText}</>;
      }
      return 'Confirm Ecash Receive';
   }, [lockedTo, gift, tokenContact, contact]);

   if (loading) {
      return (
         <Modal show={isOpen} onClose={handleModalClose}>
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
         navigator.clipboard.writeText(getEncodedTokenV4(token));
         addToast('Copied to clipboard', 'info');
      } catch (e) {
         addToast('Failed to copy to clipboard', 'error');
      }
   };

   return (
      <>
         <Modal show={isOpen} onClose={handleModalClose}>
            <Modal.Header>{title}</Modal.Header>

            <Modal.Body className='text-black flex flex-col justify-center items-center gap-6'>
               <div className={`hover:cursor-pointer ${isUserInitialized ? '' : 'my-10'}`}>
                  <Tooltip content='Copy token' onClick={handleCopy}>
                     {gift ? (
                        <div className='flex flex-row justify-center'>
                           <StickerItem
                              selectedSrc={gift.selectedSrc}
                              unselectedSrc={gift.unselectedSrc}
                              isSelected={true}
                              alt={formatUnit(gift.amount, tokenUnit || undefined)}
                              size='lg'
                           />
                        </div>
                     ) : (
                        <h3 className='text-5xl text-center'>{receiveAmountString()}</h3>
                     )}
                  </Tooltip>
               </div>

               {isUserInitialized === true && (
                  <div className='flex items-center'>
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
                  </div>
               )}

               {!alreadyClaimed && (!lockedTo || lockedTo === '02' + user.pubkey) && (
                  <div className='flex items-center justify-center'>
                     {user.receiveMode === 'mintless' ? (
                        <Button onClick={handleMintlessReceive} className='btn-primary w-48'>
                           Claim to Lightning Wallet
                        </Button>
                     ) : (
                        <>
                           {disableClaim ? (
                              <Tooltip content='testnut'>
                                 <Button
                                    disabled={disableClaim}
                                    onClick={handleSwapToMain}
                                    className='btn-primary w-36'
                                 >
                                    Claim
                                 </Button>
                              </Tooltip>
                           ) : (
                              <Button onClick={handleSwapToMain} className='btn-primary w-36'>
                                 Claim
                              </Button>
                           )}
                        </>
                     )}
                  </div>
               )}

               {!alreadyClaimed &&
                  !fromActiveMint &&
                  (!lockedTo || lockedTo === '02' + user.pubkey) &&
                  user.receiveMode !== 'mintless' && (
                     <div className='flex items-center'>
                        <Button
                           className={`btn-primary xss-button !p-0 ${mintTrusted ? 'w-30' : 'w-28'}`}
                           onClick={handleAddMint}
                           size={'xs'}
                           theme={{ size: { xs: 'px-2 text-xxs' } }}
                        >
                           {mintTrusted ? 'Claim (Source Mint)' : 'Trust and Claim'}
                        </Button>
                     </div>
                  )}
            </Modal.Body>
         </Modal>
         <ProcessingClaimModal isSwapping={swapping} />
      </>
   );
};

export default ConfirmEcashReceiveModal;

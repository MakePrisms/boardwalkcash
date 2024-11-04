import useMintlessMode from '@/hooks/boardwalk/useMintlessMode';
import { useCashuContext } from '@/hooks/contexts/cashuContext';
import { dissectToken, isTokenSpent } from '@/utils/cashu';
import { getEncodedTokenV4, Token } from '@cashu/cashu-ts';
import StickerItem from '../eGifts/stickers/StickerItem';
import useContacts from '@/hooks/boardwalk/useContacts';
import { useEffect, useMemo, useState } from 'react';
import useGifts from '@/hooks/boardwalk/useGifts';
import { GiftAsset, PublicContact } from '@/types';
import { useCashu } from '@/hooks/cashu/useCashu';
import { useToast } from '@/hooks/util/useToast';
import { Button, Spinner } from 'flowbite-react';
import { formatUnit } from '@/utils/formatting';
import Amount from '../utility/amounts/Amount';
import Tooltip from '../utility/Tooltip';
import { formatUrl } from '@/utils/url';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

interface ConfirmEcashReceiveProps {
   contact?: PublicContact;
   onSuccess?: () => void;
   token: string | Token;
   onFail?: () => void;
}

const ConfirmEcashReceive = ({ token, contact, onSuccess, onFail }: ConfirmEcashReceiveProps) => {
   const { handleClaimToSourceMint, handleClaimToActiveWallet } = useCashu();
   const { isMintless, handleMintlessClaim } = useMintlessMode();
   const user = useSelector((state: RootState) => state.user);
   const { isMintTrusted, activeMintUrl } = useCashuContext();
   const { fetchContact } = useContacts();
   const { getGiftFromToken } = useGifts();
   const { addToast } = useToast();

   const [tokenContact, setTokenContact] = useState<PublicContact | null>(null);
   const [alreadyClaimed, setAlreadyClaimed] = useState(false);
   const [gift, setGift] = useState<GiftAsset | null>(null);
   const [isClaiming, setIsClaiming] = useState(false);
   const [loading, setIsLoading] = useState(true);

   const isUserInitialized = localStorage.getItem('pubkey') !== null;

   const { amountUnit, unit, mintUrl, mintTrusted, fromActiveMint, disableClaim, pubkeyLock } =
      useMemo(() => {
         const { unit, mintUrl, pubkeyLock, amountUnit } = dissectToken(token);
         const mintTrusted = isMintTrusted(mintUrl);
         const fromActiveMint = mintUrl === activeMintUrl;
         /* disable if trying to swap to/from test mints */
         const disableClaim =
            !fromActiveMint && (mintUrl.includes('test') || activeMintUrl?.includes('test'));

         return {
            fromActiveMint,
            disableClaim,
            mintTrusted,
            pubkeyLock,
            amountUnit,
            mintUrl,
            unit,
         };
      }, [token]);

   useEffect(() => {
      const load = async () => {
         try {
            setGift(await getGiftFromToken(token));

            setAlreadyClaimed(await isTokenSpent(token));

            if (contact) {
               setTokenContact(contact);
            } else if (pubkeyLock) {
               setTokenContact(await fetchContact(pubkeyLock.slice(2)));
            }
         } catch (e) {
            console.error(e);
         } finally {
            setIsLoading(false);
         }
      };

      load();
   }, []);

   const getMintStatusIcon = () => {
      if (mintTrusted) {
         return <span className='text-green-500'>✅</span>;
      } else {
         return <span className='text-red-500'>❌</span>;
      }
   };

   const handleClaim = async (choice: 'active' | 'source' | 'mintless') => {
      let success = false;
      setIsClaiming(true);
      if (choice === 'active') {
         success = (await handleClaimToActiveWallet(token)) || false;
      } else if (choice === 'source') {
         success = await handleClaimToSourceMint(token);
      } else if (choice === 'mintless') {
         success = await handleMintlessClaim(token);
      }

      if (success && onSuccess) {
         onSuccess();
      } else if (!success && onFail) {
         onFail();
      }

      setIsClaiming(false);
   };

   const handleCopy = () => {
      const toCopy = typeof token === 'string' ? token : getEncodedTokenV4(token);
      try {
         navigator.clipboard.writeText(toCopy);
         addToast('Copied to clipboard', 'info');
      } catch (e) {
         addToast('Failed to copy to clipboard', 'error');
      }
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
      } else if (pubkeyLock) {
         return <>eTip {contactText}</>;
      }
   }, [pubkeyLock, gift, tokenContact, contact]);

   if (loading) {
      return <Spinner size='lg' />;
   }

   if (isClaiming) {
      return (
         <div className='flex flex-col items-center justify-center'>
            <Spinner size='lg' />
            <p className='text-center text-sm'>Claiming...</p>
         </div>
      );
   }

   return (
      <div className='flex flex-col items-center justify-around h-full'>
         <div className='flex flex-col items-center justify-center gap-6'>
            {title && <h2 className='text-xl text-black'>{title}</h2>}
            <Tooltip content='Copy token' onClick={handleCopy}>
               <div className='flex justify-center items-center'>
                  {gift ? (
                     <StickerItem
                        selectedSrc={gift.selectedSrc}
                        unselectedSrc={gift.unselectedSrc}
                        isSelected={true}
                        alt={formatUnit(gift.amount, unit || undefined)}
                        size='lg'
                     />
                  ) : (
                     <Amount
                        unit={unit}
                        value={amountUnit}
                        isDollarAmount={false}
                        className='font-teko text-6xl font-bold text-black'
                     />
                  )}
               </div>
            </Tooltip>
            {isUserInitialized /* only show mint status boardwalk is set up */ && (
               <p className='text-center text-sm text-gray-500'>
                  <a
                     href={`https://bitcoinmints.com/?tab=reviews&mintUrl=${encodeURIComponent(mintUrl)}`}
                     target='_blank'
                     className='underline'
                  >
                     {formatUrl(mintUrl)}
                  </a>{' '}
                  {getMintStatusIcon()}
               </p>
            )}
         </div>

         <div className='flex flex-col gap-6 w-full'>
            {!alreadyClaimed && (!pubkeyLock || pubkeyLock === '02' + user.pubkey) && (
               <>
                  {isMintless ? (
                     <Button onClick={() => handleClaim('mintless')} className='btn-primary'>
                        Claim to Lightning Wallet
                     </Button>
                  ) : (
                     <>
                        {disableClaim ? (
                           <Tooltip content='testnut'>
                              <Button disabled={true} className='btn-primary w-full'>
                                 Claim
                              </Button>
                           </Tooltip>
                        ) : (
                           <Button
                              onClick={() => handleClaim('active')}
                              className='btn-primary w-full'
                           >
                              Claim
                           </Button>
                        )}
                     </>
                  )}
               </>
            )}

            {!alreadyClaimed &&
               !fromActiveMint &&
               !isMintless &&
               (!pubkeyLock || pubkeyLock === '02' + user.pubkey) && (
                  <div className='flex items-center justify-center'>
                     <Button
                        className={`btn-primary !p-0 w-full`}
                        onClick={() => handleClaim('source')}
                        size={'xs'}
                     >
                        {mintTrusted ? 'Claim (Source Mint)' : 'Trust and Claim'}
                     </Button>
                  </div>
               )}
         </div>
      </div>
   );
};

export default ConfirmEcashReceive;
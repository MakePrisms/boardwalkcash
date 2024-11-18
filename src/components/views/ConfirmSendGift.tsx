import ClipboardButton from '../buttons/utility/ClipboardButton';
import StickerItem from '../eGifts/stickers/StickerItem';
import { GiftAsset, PublicContact } from '@/types';
import SplitIcon from '../icons/SplitIcon';
import Tooltip from '../utility/Tooltip';
import { Button } from 'flowbite-react';
import UserLink from '../utility/UserLink';

interface ConfirmSendGiftProps {
   contact?: PublicContact;
   onSendGift: () => void;
   sendingGift?: boolean;
   gift: GiftAsset;
   token?: string;
   txid?: string;
}

const ConfirmSendGift = ({
   gift,
   txid,
   token,
   onSendGift,
   sendingGift,
   contact,
}: ConfirmSendGiftProps) => {
   return (
      <div className='view-ecash-container'>
         <div className='flex flex-col justify-center items-center text-black text-2xl gap-6'>
            <StickerItem
               selectedSrc={gift.selectedSrc}
               unselectedSrc={gift.selectedSrc}
               isSelected={false}
               alt={'gift'}
               size='lg'
            />
            {contact?.username && (
               <p className='text-center text-md'>
                  eGift for <UserLink username={contact.username} />
               </p>
            )}
            {txid && (
               <ClipboardButton
                  toCopy={`${window.location.origin}/wallet?txid=${txid}`}
                  toShow={'Share'}
                  className='btn-primary hover:!bg-[var(--btn-primary-bg)] mt-6'
               />
            )}
         </div>
         {gift?.fee && (
            <div className='flex justify-center mb-2'>
               <p className='text-xs flex items-center text-gray-500'>
                  <span className='flex items-center'>
                     <Tooltip position='top' content='50% of the fee is paid to OpenSats'>
                        <div className='flex items-center justify-center w-4 h-4'>
                           <SplitIcon className='h-3 w-3 text-gray-500' />
                        </div>
                     </Tooltip>
                  </span>
               </p>
            </div>
         )}
         {!token && (
            <div className='w-full flex justify-center items-center'>
               <Button
                  key='gift-send'
                  className='btn-primary h-full'
                  onClick={onSendGift}
                  isProcessing={sendingGift}
                  id='send-button'
               >
                  Send
               </Button>
            </div>
         )}
      </div>
   );
};

export default ConfirmSendGift;

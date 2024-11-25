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
         <div className='flex flex-col justify-center items-center text-black gap-6'>
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
         </div>
         {txid && (
            <ClipboardButton
               toCopy={`${window.location.origin}/wallet?txid=${txid}`}
               toShow={'Share'}
               className='btn-primary hover:!bg-[var(--btn-primary-bg)]'
            />
         )}
         {gift?.fee && (
            <div className='flex justify-center'>
               <p className='text-xs flex items-center text-gray-500'>
                  <span className='flex items-center'>
                     <Tooltip position='top' content='10% shared with the artist'>
                        <div className='flex items-center justify-center'>
                           <SplitIcon className='h-8 w-8 text-gray-500' />
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
                  className='btn-primary !p-0'
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

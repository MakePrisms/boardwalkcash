import ClipboardButton from '../buttons/utility/ClipboardButton';
import StickerItem from '../eGifts/stickers/StickerItem';
import { GiftAsset, PublicContact } from '@/types';
import SplitIcon from '../icons/SplitIcon';
import Tooltip from '../utility/Tooltip';
import { Button } from 'flowbite-react';

interface ConfirmSendGiftProps {
   contact?: PublicContact;
   onSendGift: () => void;
   gift: GiftAsset;
   token?: string;
   txid?: string;
}

const ConfirmSendGift = ({ gift, txid, token, onSendGift, contact }: ConfirmSendGiftProps) => {
   return (
      <div className='flex flex-col justify-between w-full text-black h-full'>
         <div className='flex flex-col justify-center items-center text-black text-2xl gap-6'>
            {contact && <p>eGift for {contact.username}</p>}
            <StickerItem
               selectedSrc={gift.selectedSrc}
               unselectedSrc={gift.selectedSrc}
               isSelected={false}
               alt={'gift'}
               size='lg'
            />
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
            <div className='w-full flex justify-center mt-4'>
               <div className='w-full h-10'>
                  <Button
                     key='gift-send'
                     className='btn-primary w-full h-full'
                     onClick={onSendGift}
                     id='send-button'
                  >
                     Send
                  </Button>
               </div>
            </div>
         )}
      </div>
   );
};

export default ConfirmSendGift;

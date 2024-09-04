import useGifts from '@/hooks/boardwalk/useGifts';
import { Modal, Spinner } from 'flowbite-react';
import StickerItem from '../eGifts/stickers/StickerItem';

interface ViewTotalGiftsModalProps {
   isOpen: boolean;
   onClose: () => void;
   giftsData?: { [giftName: string]: number };
}

const ViewTotalGiftsModal = ({ isOpen, onClose, giftsData }: ViewTotalGiftsModalProps) => {
   const { giftAssets, loadingGifts } = useGifts();

   return (
      <Modal show={isOpen} onClose={onClose} className='text-black'>
         <Modal.Header>Total eGifts</Modal.Header>
         <Modal.Body className='grid md:grid-cols-3 grid-cols-2 gap-10 w-full'>
            {loadingGifts ? (
               <Spinner size='lg' />
            ) : (
               Object.entries(giftsData || {}).map(([giftName, count]) => (
                  <div key={giftName} className='relative'>
                     <StickerItem
                        selectedSrc={giftAssets[giftName].selectedSrc}
                        unselectedSrc={giftAssets[giftName].unselectedSrc}
                        isSelected={true}
                        alt={giftAssets[giftName].name}
                        size='md'
                        count={count}
                     />
                  </div>
               ))
            )}
         </Modal.Body>
      </Modal>
   );
};

export default ViewTotalGiftsModal;

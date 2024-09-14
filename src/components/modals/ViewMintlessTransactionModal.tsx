import { GiftAsset, PublicContact } from '@/types';
import { Modal } from 'flowbite-react';
import { useEffect, useMemo, useState } from 'react';
import { ViewGiftModalBody } from '../eGifts/ViewGiftModal';
import useGifts from '@/hooks/boardwalk/useGifts';
import { format } from 'path';
import { formatCents } from '@/utils/formatting';

interface ViewMintlessTransactionModalProps {
   isOpen: boolean;
   onClose: () => void;
   amountUsdCents: number;
   contact: PublicContact;
   giftName: string | null;
}

const ViewMintlessTransactionModal = ({
   isOpen,
   onClose,
   amountUsdCents,
   contact,
   giftName,
}: ViewMintlessTransactionModalProps) => {
   const [isLoading, setIsLoading] = useState(true);
   const [gift, setGift] = useState<GiftAsset | undefined>(undefined);

   const { fetchGift } = useGifts();

   useEffect(() => {
      const loadGift = async () => {
         if (!giftName) return;
         const gift = await fetchGift(giftName).then(g => g);
         if (!gift) {
            console.error('Gift not found:', giftName);
            return;
         }
         setGift(gift);
      };
      setIsLoading(true);
      loadGift().finally(() => setIsLoading(false));
   }, []);

   const title = useMemo(() => {
      return 'Mintless Transaction';
   }, []);

   return (
      <Modal show={isOpen} onClose={onClose}>
         <Modal.Header>{title}</Modal.Header>
         <Modal.Body>
            {giftName !== null &&
               (isLoading ? (
                  <div className='flex justify-center mt-4'>Loading...</div>
               ) : (
                  <ViewGiftModalBody
                     amountCents={amountUsdCents}
                     stickerPath={gift?.selectedSrc!}
                  />
               ))}
            {giftName === null && (
               <div className='flex justify-center mt-4 text-black'>
                  <p>{formatCents(amountUsdCents)}</p>
               </div>
            )}
         </Modal.Body>
      </Modal>
   );
};

export default ViewMintlessTransactionModal;

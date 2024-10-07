import { Currency, GiftAsset, PublicContact } from '@/types';
import { Modal } from 'flowbite-react';
import { useEffect, useMemo, useState } from 'react';
import { ViewGiftModalBody } from '../eGifts/ViewGiftModal';
import useGifts from '@/hooks/boardwalk/useGifts';
import { formatUnit } from '@/utils/formatting';
import { WalletIcon } from '@heroicons/react/20/solid';

interface ViewMintlessTransactionModalProps {
   isOpen: boolean;
   onClose: () => void;
   amountUnit: number;
   unit: Currency;
   contact?: PublicContact;
   giftName: string | null;
}

const ViewMintlessTransactionModal = ({
   isOpen,
   onClose,
   amountUnit,
   unit,
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
      const thing = giftName ? 'eGift' : 'eTip';
      return `${thing} ${contact?.username ? `from ${contact.username}` : ''}`;
   }, [contact?.username, giftName]);

   return (
      <Modal show={isOpen} onClose={onClose}>
         <Modal.Header>{title}</Modal.Header>
         <Modal.Body className='text-black flex flex-col justify-center items-center gap-6'>
            {giftName !== null &&
               (isLoading ? (
                  <div className='flex justify-center mt-4'>Loading...</div>
               ) : (
                  <ViewGiftModalBody amountCents={amountUnit} stickerPath={gift?.selectedSrc!} />
               ))}
            {giftName === null && (
               <h3 className='text-5xl text-center'>{formatUnit(amountUnit, unit)}</h3>
            )}
            <div className='flex justify-center mt-4'>
               Claimed to wallet <WalletIcon className='w-5 h-5 ml-3' />
            </div>
         </Modal.Body>
      </Modal>
   );
};

export default ViewMintlessTransactionModal;

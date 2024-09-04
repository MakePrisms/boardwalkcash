import { GiftMetrics } from '@/types';
import { formatCents } from '@/utils/formatting';
import { Card } from 'flowbite-react';
import { useState } from 'react';
import ViewTotalGiftsModal from '../modals/ViewTotalGiftsModal';

interface UserStatsCardProps {
   title: string;
   userData?: GiftMetrics;
}

const UserStatsCard = ({ userData, title }: UserStatsCardProps) => {
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [selectedGifts, setSelectedGifts] = useState<{ [giftName: string]: number } | null>(null);

   const handleRowClick = (giftCount: { [giftName: string]: number }) => {
      setSelectedGifts(giftCount);
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedGifts(null);
   };

   return (
      <>
         <Card
            onClick={() => handleRowClick(userData?.giftCount || {})}
            className='transition-all duration-300 ease-in-out transform hover:scale-105 hover:cursor-pointer bg-[#0f3470] text-white border-none rounded-none'
         >
            <h3 style={{ fontWeight: 'bold' }} className='text-smmb-2'>
               {title}
            </h3>
            <p className='text-sm'>Total: {userData?.total || 0}</p>
            <p className='text-sm'>Amount: {formatCents(userData?.totalAmountCents || 0)}</p>
         </Card>
         {selectedGifts && (
            <ViewTotalGiftsModal
               isOpen={isModalOpen}
               onClose={closeModal}
               giftsData={selectedGifts}
            />
         )}
      </>
   );
};

export default UserStatsCard;

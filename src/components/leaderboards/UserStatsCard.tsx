import { GiftMetrics } from '@/types';
import { formatCents } from '@/utils/formatting';
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
      if (Object.keys(giftCount).length > 0) {
         setSelectedGifts(giftCount);
         setIsModalOpen(true);
      }
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedGifts(null);
   };

   const hasUserData = userData && userData?.total > 0;

   return (
      <>
         <div
            onClick={() => handleRowClick(userData?.giftCount || {})}
            className={`bg-[#0f3470] text-white border-none rounded-none ${
               hasUserData
                  ? 'transition-all duration-300 ease-in-out transform hover:scale-105 hover:cursor-pointer'
                  : ''
            }`}
         >
            <div className='bg-[#0c2b5c] p-3 flex items-center justify-center'>
               <h3 style={{ fontWeight: 'bold' }} className='text-sm text-white text-center'>
                  {title}
               </h3>
            </div>
            <div className='p-3 flex flex-row justify-between'>
               <p className='text-sm'>Total: {userData?.total || 0}</p>
               <p className='text-sm'>Amount: {formatCents(userData?.totalAmountCents || 0)}</p>
            </div>
         </div>
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

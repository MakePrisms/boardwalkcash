import React, { useState } from 'react';
import { Table, Pagination } from 'flowbite-react';
import { GiftMetrics } from '@/types';
import { formatCents } from '@/utils/formatting';
import ViewTotalGiftsModal from '../modals/ViewTotalGiftsModal';
import { leaderboardTableTheme } from '@/themes/tableThemes';

interface LeaderboardTableProps {
   title: string;
   data: Record<string, GiftMetrics>;
   currentPage: number;
   onPageChange: (page: number) => void;
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
   title,
   data,
   currentPage,
   onPageChange,
}) => {
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [selectedGifts, setSelectedGifts] = useState<{ [giftName: string]: number } | null>(null);

   const itemsPerPage = 10;

   const paginatedData = Object.entries(data).slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
   );

   const handleRowClick = (giftCount: { [giftName: string]: number }) => {
      setSelectedGifts(giftCount);
      setIsModalOpen(true);
   };

   return (
      <>
         <h2 className='text-lg mb-4'>{title}</h2>
         <Table theme={leaderboardTableTheme}>
            <Table.Head className='bg-[#0c2b5c] text-center'>
               <Table.HeadCell className='w-1/3'>User</Table.HeadCell>
               <Table.HeadCell className='w-1/3'>Gifts</Table.HeadCell>
               <Table.HeadCell className='w-1/3'>Total</Table.HeadCell>
            </Table.Head>
            <Table.Body>
               {paginatedData.map(([_, rowData]) => (
                  <Table.Row
                     key={rowData.username}
                     onClick={() => handleRowClick(rowData.giftCount)}
                     className='cursor-pointer hover:bg-[#0c2b5c] text-center'
                  >
                     <Table.Cell className='w-1/3'>{rowData.username}</Table.Cell>
                     <Table.Cell className='w-1/3'>{rowData.total}</Table.Cell>
                     <Table.Cell className='w-1/3'>
                        {formatCents(rowData.totalAmountCents)}
                     </Table.Cell>
                  </Table.Row>
               ))}
            </Table.Body>
         </Table>
         {Math.ceil(Object.keys(data).length / itemsPerPage) > 1 && (
            <div className='flex justify-center mt-6'>
               <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(Object.keys(data).length / itemsPerPage)}
                  onPageChange={onPageChange}
                  showIcons={true}
                  layout='navigation'
               />
            </div>
         )}
         {selectedGifts && (
            <ViewTotalGiftsModal
               isOpen={isModalOpen}
               onClose={() => setIsModalOpen(false)}
               giftsData={selectedGifts}
            />
         )}
      </>
   );
};

export default LeaderboardTable;

import React from 'react';
import { Card, Table, Pagination } from 'flowbite-react';
import { GiftMetrics } from '@/types';
import { formatCents } from '@/utils/formatting';

interface LeaderboardTableProps {
   title: string;
   data: Record<string, GiftMetrics>;
   currentPage: number;
   onPageChange: (page: number) => void;
   onRowClick: (giftCount: { [giftName: string]: number }) => void;
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
   title,
   data,
   currentPage,
   onPageChange,
   onRowClick,
}) => {
   const itemsPerPage = 5;

   const paginatedData = Object.entries(data).slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
   );

   return (
      <Card>
         <h2 className='text-xl mb-4'>{title}</h2>
         <Table>
            <Table.Head>
               <Table.HeadCell>User</Table.HeadCell>
               <Table.HeadCell>Gifts</Table.HeadCell>
               <Table.HeadCell>Total Amount</Table.HeadCell>
            </Table.Head>
            <Table.Body>
               {paginatedData.map(([_, rowData]) => (
                  <Table.Row
                     key={rowData.username}
                     onClick={() => onRowClick(rowData.giftCount)}
                     className='cursor-pointer hover:bg-gray-100'
                  >
                     <Table.Cell>{rowData.username}</Table.Cell>
                     <Table.Cell>{rowData.total}</Table.Cell>
                     <Table.Cell>{formatCents(rowData.totalAmountCents)}</Table.Cell>
                  </Table.Row>
               ))}
            </Table.Body>
         </Table>
         {Math.ceil(Object.keys(data).length / itemsPerPage) > 1 && (
            <div className='flex overflow-x-auto sm:justify-center'>
               <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(Object.keys(data).length / itemsPerPage)}
                  onPageChange={onPageChange}
                  showIcons={true}
               />
            </div>
         )}
      </Card>
   );
};

export default LeaderboardTable;

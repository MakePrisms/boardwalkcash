import { EcashTransaction, LightningTransaction } from '@/redux/slices/HistorySlice';
import { Table, Pagination } from 'flowbite-react';
import React, { useState } from 'react';
import HistoryTableRow from './HistoryTableRow';

const HistoryTable: React.FC<{
   history: (EcashTransaction | LightningTransaction)[];
}> = ({ history }) => {
   const [currentPage, setCurrentPage] = useState(1);

   // Calculate start and end indexes based on current page
   const startIndex = (currentPage - 1) * 10;
   const endIndex = currentPage * 10;

   return (
      <>
         <Table className='overflow-y-scroll text-white bg-[#0f3470]'>
            <Table.Body>
               {history
                  .slice(startIndex, endIndex)
                  .map((tx: EcashTransaction | LightningTransaction, i) => (
                     <HistoryTableRow key={i} tx={tx} />
                  ))}
            </Table.Body>
         </Table>
         <div className='flex justify-center mt-4'>
            <Pagination
               layout='navigation'
               currentPage={currentPage}
               totalPages={Math.ceil(history.length / 10)}
               onPageChange={setCurrentPage}
            />
         </div>
      </>
   );
};

export default HistoryTable;

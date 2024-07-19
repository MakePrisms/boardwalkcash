import { EcashTransaction, LightningTransaction } from '@/redux/slices/HistorySlice';
import { Table } from 'flowbite-react';
import React from 'react';
import HistoryTableRow from './HistoryTableRow';

const customTheme = {
   root: {
      base: 'md:max-w-fit w-full text-left text-sm text-gray-500 dark:text-gray-400  bg-[#0f3470] ',
      shadow: 'absolute left-0 top-0 -z-10 h-full  rounded-lg bg-white drop-shadow-md',
      wrapper: 'relative flex justify-center',
   },
};

const HistoryTable: React.FC<{
   history: (EcashTransaction | LightningTransaction)[];
}> = ({ history }) => {
   return (
      <>
         <Table theme={customTheme} className='text-white'>
            <Table.Body>
               {history.map((tx: EcashTransaction | LightningTransaction, i) => (
                  <HistoryTableRow key={i} tx={tx} />
               ))}
            </Table.Body>
         </Table>
      </>
   );
};

export default HistoryTable;

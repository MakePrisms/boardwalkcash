import { EcashTransaction, LightningTransaction } from '@/redux/slices/HistorySlice';
import { RootState } from '@/redux/store';
import { Drawer, Pagination } from 'flowbite-react';
import { ComponentProps, FC, useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import HistoryTable from './HistoryTable';

type NewType = FC<ComponentProps<'svg'>>;

const NoIcon: NewType = () => null;

const ClockIcon = () => {
   return (
      <svg
         xmlns='http://www.w3.org/2000/svg'
         fill='none'
         viewBox='0 0 24 24'
         strokeWidth={1.5}
         stroke='currentColor'
         className='w-6 h-6'
      >
         <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
         />
      </svg>
   );
};

const customTheme = {
   header: {
      inner: {
         titleText:
            'mb-4 inline-flex items-center text-base font-semibold text-gray-200 dark:text-gray-400',
      },
   },
};

const TransactionHistoryDrawer = () => {
   const [hidden, setHidden] = useState(true);
   const [allTransactions, setAllTransactions] = useState<
      (EcashTransaction | LightningTransaction)[]
   >([]);
   const [currentPage, setCurrentPage] = useState(1);

   // Calculate start and end indexes based on current page
   const startIndex = (currentPage - 1) * 8;
   const endIndex = currentPage * 8;

   const history = useSelector((state: RootState) => state.history);

   const mergeAndSortHistory = useCallback(() => {
      const { ecash, lightning } = history;
      const merged = [...ecash, ...lightning];
      merged.sort((a, b) => {
         return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      return merged;
   }, [history]);

   useEffect(() => {
      setAllTransactions(mergeAndSortHistory());
   }, [mergeAndSortHistory]);

   return (
      <>
         <button className='fixed right-10 top-0 m-4 p-2 z-10' onClick={() => setHidden(!hidden)}>
            <ClockIcon />
         </button>
         <Drawer
            open={!hidden}
            onClose={() => setHidden(true)}
            edge={false}
            position='right'
            className='md:min-w-fit min-w-full bg-[#0f1f41ff] text-white flex flex-col'
            theme={customTheme}
         >
            <Drawer.Header title='Activity' titleIcon={NoIcon} className='mt-5' />
            <Drawer.Items className='flex-grow'>
               <div className='flex flex-col h-full'>
                  {allTransactions.length > 0 ? (
                     <HistoryTable history={allTransactions.slice(startIndex, endIndex)} />
                  ) : (
                     <div className='flex justify-center mt-4'>No transactions</div>
                  )}
                  <div className='flex justify-center'>
                     {allTransactions.length > 10 && (
                        <Pagination
                           layout='navigation'
                           currentPage={currentPage}
                           totalPages={Math.ceil(allTransactions.length / 8)}
                           onPageChange={setCurrentPage}
                        />
                     )}
                  </div>
               </div>
            </Drawer.Items>
         </Drawer>
      </>
   );
};

export default TransactionHistoryDrawer;

import {
   EcashTransaction,
   LightningTransaction,
   TxStatus,
   updateTransactionStatus,
} from '@/redux/slices/HistorySlice';
import { RootState } from '@/redux/store';
import { Drawer, Pagination } from 'flowbite-react';
import { ComponentProps, FC, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import HistoryTable from './HistoryTable';
import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts';
import { customDrawerTheme } from '@/themes/drawerTheme';
import BWCLogoIcon from '../BWCLogoIcon';

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

export const XMark = () => (
   <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
      strokeWidth={1.5}
      stroke='white'
      className='w-7 h-7'
   >
      <path strokeLinecap='round' strokeLinejoin='round' d='M6 18 18 6M6 6l12 12' />
   </svg>
);

const TransactionHistoryDrawer = () => {
   const [hidden, setHidden] = useState(true);
   const [allTransactions, setAllTransactions] = useState<
      (EcashTransaction | LightningTransaction)[]
   >([]);
   const [currentPage, setCurrentPage] = useState(1);

   const dispatch = useDispatch();

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
      const groupTransactionsByMint = (transactions: EcashTransaction[]) => {
         return transactions.reduce(
            (acc, tx) => {
               if (!acc[tx.mint]) {
                  acc[tx.mint] = [];
               }
               acc[tx.mint].push(tx);
               return acc;
            },
            {} as Record<string, EcashTransaction[]>,
         );
      };

      const extractProofs = (transactions: EcashTransaction[]) => {
         return transactions.flatMap(({ token }) => {
            const decoded = getDecodedToken(token);
            return decoded.token[0].proofs;
         });
      };

      const checkAndUpdatePending = async () => {
         const pendingEcash = history.ecash.filter(tx => tx.status === TxStatus.PENDING);
         const groupedByMint = groupTransactionsByMint(pendingEcash);

         for (const mint in groupedByMint) {
            const mintTransactions = groupedByMint[mint];
            const proofs = extractProofs(mintTransactions);

            const spent = await new CashuWallet(new CashuMint(mint)).checkProofsSpent(proofs);

            if (spent.length > 0) {
               const spentSecrets = spent.map(s => s.secret);

               mintTransactions.forEach(tx => {
                  const decoded = getDecodedToken(tx.token);
                  const txSecrets = decoded.token[0].proofs.map(p => p.secret);

                  const isSpent = txSecrets.some(secret => spentSecrets.includes(secret));
                  console.log('isSpent', isSpent);

                  if (isSpent) {
                     dispatch(
                        updateTransactionStatus({
                           type: 'ecash',
                           token: tx.token,
                           status: TxStatus.PAID,
                        }),
                     );
                  }
               });
            }
         }
      };

      checkAndUpdatePending();
   }, [history.ecash, dispatch]);

   useEffect(() => {
      setAllTransactions(mergeAndSortHistory());
   }, [mergeAndSortHistory]);

   return (
      <>
         <button className='fixed right-12 top-0 m-4 p-2 z-10' onClick={() => setHidden(!hidden)}>
            <ClockIcon />
         </button>
         <Drawer
            open={!hidden}
            onClose={() => setHidden(true)}
            edge={false}
            position='right'
            theme={customDrawerTheme}
         >
            <Drawer.Header
               title='Activity'
               titleIcon={() => <BWCLogoIcon className='w-[40px] h-auto' />}
               closeIcon={XMark}
            />
            <Drawer.Items className='flex-grow'>
               <div className='flex flex-col h-full'>
                  {allTransactions.length > 0 ? (
                     <HistoryTable history={allTransactions.slice(startIndex, endIndex)} />
                  ) : (
                     <div className='flex justify-center mt-4'>No transactions</div>
                  )}
                  <div className='flex justify-center mt-4'>
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

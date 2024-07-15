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
import { CashuMint, CashuWallet, Proof, getDecodedToken } from '@cashu/cashu-ts';
import { customDrawerTheme } from '@/themes/drawerTheme';
import { XMarkIcon } from '@heroicons/react/20/solid';
import ClockIcon from '@/components/icons/ClockIcon';

type NewType = FC<ComponentProps<'svg'>>;

const NoIcon: NewType = () => null;

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

            let spent: Proof[] = [];
            try {
               spent = await new CashuWallet(new CashuMint(mint)).checkProofsSpent(proofs);
            } catch {
               spent = [];
            }

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
            className='md:min-w-fit min-w-full bg-[#0f1f41ff] text-white flex flex-col'
            theme={customDrawerTheme}
         >
            <Drawer.Header
               className='drawer-header'
               title='Activity'
               titleIcon={() => null}
               closeIcon={() => <XMarkIcon className='h-8 w-8' />}
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

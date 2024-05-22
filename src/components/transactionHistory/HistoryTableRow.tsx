import { useToast } from '@/hooks/useToast';
import {
   EcashTransaction,
   Transaction,
   TxStatus,
   isEcashTransaction,
   updateTransactionStatus,
} from '@/redux/slices/HistorySlice';
import { RootState } from '@/redux/store';
import { addBalance } from '@/utils/cashu';
import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts';
import { BanknotesIcon, BoltIcon } from '@heroicons/react/20/solid';
import { Spinner, Table } from 'flowbite-react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const HistoryTableRow: React.FC<{ tx: Transaction }> = ({ tx }) => {
   const [reclaiming, setReclaiming] = useState(false);

   const wallets = useSelector((state: RootState) => state.wallet.keysets);

   const dispatch = useDispatch();
   const { addToast } = useToast();

   const formatDate = (date: string) => {
      const [datePart, timePart] = date.split(', ');
      const [month, day] = datePart.split('/').slice(0, 2);
      const [time, period] = timePart.split(' ');
      const [hour, minute, second] = time.split(':');
      return `${month}/${day}, ${hour}:${minute} ${period}`;
   };
   const formatAmount = (amount: number) => {
      let color;
      if (amount < 0) {
         color = 'text-red-500';
      } else {
         color = 'text-green-500';
      }

      const text = `$${(Math.abs(amount) / 100).toFixed(2)}`;

      return <span className={color}>{text}</span>;
   };

   const handleReclaim = async (transaction: EcashTransaction) => {
      const keyset = Object.values(wallets).find(keyset => keyset.url === transaction.mint);
      if (!keyset) {
         addToast('Keyset not found', 'error');
         return;
      }

      const wallet = new CashuWallet(new CashuMint(transaction.mint), { ...keyset });

      const proofs = getDecodedToken(transaction.token).token[0].proofs;

      setReclaiming(true);

      const spent = await wallet.checkProofsSpent(proofs).catch(e => {
         addToast('Failed to check token status', 'error');
         console.error(e);
         setReclaiming(false);
      });

      if (!spent) return;

      console.log('Spent tokens', spent);

      if (spent.length > 0) {
         addToast('Proofs already claimed', 'error');
         dispatch(
            updateTransactionStatus({
               type: 'ecash',
               token: transaction.token,
               status: TxStatus.PAID,
            }),
         );
      } else {
         const newTokens = await wallet.receive(transaction.token);
         const newProofs = newTokens.token.token[0].proofs;
         addBalance(newProofs);
         addToast(
            `Reclaimed $${(newProofs.reduce((a, b) => (a += b.amount), 0) / 100).toFixed(2)}`,
            'success',
         );
         dispatch(
            updateTransactionStatus({
               type: 'ecash',
               token: transaction.token,
               status: TxStatus.PAID,
            }),
         );
      }

      setReclaiming(false);
   };
   return (
      <Table.Row>
         <Table.Cell className='pe-0'>{formatDate(tx.date)}</Table.Cell>
         <Table.Cell className='pe-0'>{formatAmount(tx.amount)}</Table.Cell>
         <Table.Cell className='flex justify-center'>
            {tx.status === TxStatus.PENDING && isEcashTransaction(tx) ? (
               reclaiming ? (
                  <Spinner size={'sm'} />
               ) : (
                  <button className='underline' onClick={() => handleReclaim(tx)}>
                     Reclaim
                  </button>
               )
            ) : isEcashTransaction(tx) ? (
               <BanknotesIcon className='h-5 w-5' />
            ) : (
               <BoltIcon className='h-5 w-5' />
            )}
         </Table.Cell>
      </Table.Row>
   );
};

export default HistoryTableRow;

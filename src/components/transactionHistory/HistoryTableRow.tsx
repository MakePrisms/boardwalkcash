import { useToast } from '@/hooks/useToast';
import {
   EcashTransaction,
   Transaction,
   TxStatus,
   isEcashTransaction,
   isLightningTransaction,
   updateTransactionStatus,
} from '@/redux/slices/HistorySlice';
import { setBalance } from '@/redux/slices/Wallet.slice';
import { RootState } from '@/redux/store';
import { CashuMint, CashuWallet, Proof, getDecodedToken } from '@cashu/cashu-ts';
import { BanknotesIcon, BoltIcon } from '@heroicons/react/20/solid';
import { Spinner, Table } from 'flowbite-react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import VaultIcon from '../icons/VaultIcon';
import { useProofStorage } from '@/hooks/useProofStorage';

const HistoryTableRow: React.FC<{ tx: Transaction }> = ({ tx }) => {
   const [reclaiming, setReclaiming] = useState(false);

   const wallets = useSelector((state: RootState) => state.wallet.keysets);
   const { addProofs } = useProofStorage();

   const dispatch = useDispatch();
   const { addToast } = useToast();

   const getIcon = (tx: Transaction) => {
      if (isEcashTransaction(tx) && tx.isReserve) {
         return <VaultIcon className='h-5 w-5' fill={true} />;
      }

      if (isEcashTransaction(tx)) {
         return <BanknotesIcon className='h-5 w-5' />;
      } else if (isLightningTransaction(tx)) {
         return <BoltIcon className='h-5 w-5' />;
      }
   };

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
         color = 'text-white';
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
         const { token, tokensWithErrors } = await wallet.receive(transaction.token);

         if (tokensWithErrors !== undefined) {
            addToast('Failed to reclaim tokens', 'error');
            setReclaiming(false);
            return;
         }

         const newProofs = token.token[0].proofs;
         addProofs(newProofs);
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

         const newBalance = (JSON.parse(localStorage.getItem('proofs') || '[]') as Proof[]).reduce(
            (a, b) => a + b.amount,
            0,
         );

         dispatch(setBalance({ usd: newBalance }));
      }

      setReclaiming(false);
   };
   return (
      <Table.Row>
         <Table.Cell className='pe-0 md:pe-6'>{formatDate(tx.date)}</Table.Cell>
         <Table.Cell className='pe-0 md:pe-6'>{formatAmount(tx.amount)}</Table.Cell>
         <Table.Cell className='flex justify-center min-w-[116px]'>
            {tx.status === TxStatus.PENDING && isEcashTransaction(tx) ? (
               reclaiming ? (
                  <Spinner size={'sm'} />
               ) : (
                  <button className='underline' onClick={() => handleReclaim(tx)}>
                     Reclaim
                  </button>
               )
            ) : (
               getIcon(tx)
            )}
         </Table.Cell>
      </Table.Row>
   );
};

export default HistoryTableRow;

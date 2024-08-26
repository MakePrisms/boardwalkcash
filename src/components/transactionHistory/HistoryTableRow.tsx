import { useToast } from '@/hooks/util/useToast';
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
import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import VaultIcon from '../icons/VaultIcon';
import { useProofStorage } from '@/hooks/cashu/useProofStorage';
import { useCashu } from '@/hooks/cashu/useCashu';
import GiftIcon from '../icons/GiftIcon';
import { formatCents } from '@/utils/formatting';

const HistoryTableRow: React.FC<{
   tx: Transaction;
   openSendEcashModal: (tx: EcashTransaction) => void;
   openViewGiftModal: (tx: EcashTransaction & { gift: string }) => void;
}> = ({ tx, openSendEcashModal, openViewGiftModal }) => {
   const [reclaiming, setReclaiming] = useState(false);

   const wallets = useSelector((state: RootState) => state.wallet.keysets);
   const { addProofs } = useProofStorage();

   const dispatch = useDispatch();
   const { addToast } = useToast();
   const user = useSelector((state: RootState) => state.user);
   const { proofsLockedTo, isTokenSpent } = useCashu();

   const getIcon = (tx: Transaction) => {
      if (isEcashTransaction(tx) && tx.isReserve) {
         return <VaultIcon className='h-5 w-5' fill={true} />;
      }

      if (isEcashTransaction(tx)) {
         if (tx.gift) {
            return <GiftIcon className='h-5 w-5' />;
         }
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
   const formatAmount = (amount: number, fee?: number) => {
      let color = amount < 0 ? 'text-white' : 'text-green-500';
      const text = formatCents(Math.abs(amount) + (fee || 0), false);

      return <span className={`${color} flex items-center`}>{text}</span>;
   };

   const handleReclaim = async (transaction: EcashTransaction) => {
      const keyset = Object.values(wallets).find(keyset => keyset.url === transaction.mint);
      if (!keyset) {
         addToast('Keyset not found', 'error');
         return;
      }

      const wallet = new CashuWallet(new CashuMint(transaction.mint), { ...keyset });

      const proofs = getDecodedToken(transaction.token).token[0].proofs;

      let privkey: string | undefined;
      if (proofsLockedTo(proofs) === '02' + user.pubkey) {
         privkey = user.privkey;
      }

      setReclaiming(true);

      const spent = await wallet.checkProofsSpent(proofs).catch(e => {
         addToast('Failed to check token status' + e.detail || e.message || '', 'error');
         console.error(e);
         setReclaiming(false);
      });

      if (!spent) return;

      console.log('Spent tokens', spent);

      if (spent.length > 0) {
         handleSpentToken(transaction);
      } else {
         const newProofs = await wallet.receive(transaction.token, { privkey });

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

   const handleSpentToken = (tx: EcashTransaction) => {
      addToast('ecash already claimed', 'error');
      dispatch(
         updateTransactionStatus({
            type: 'ecash',
            token: tx.token,
            status: TxStatus.PAID,
         }),
      );
      setReclaiming(false);
   };

   const handleLockedToken = async (tx: EcashTransaction) => {
      if (await isTokenSpent(tx.token)) {
         handleSpentToken(tx);
         return;
      }
      if (tx.gift) {
         openViewGiftModal(tx as EcashTransaction & { gift: string });
      } else {
         openSendEcashModal(tx);
      }
   };

   const getStatusCell = useCallback(
      (tx: Transaction) => {
         if (tx.status === TxStatus.PENDING && isEcashTransaction(tx)) {
            if (tx.gift) {
               return (
                  <div className='flex justify-center'>
                     <button className='underline' onClick={() => handleLockedToken(tx)}>
                        eGift
                     </button>
                  </div>
               );
            }
            if (tx.pubkey !== undefined && tx.pubkey !== user.pubkey) {
               return (
                  <div className='flex justify-center'>
                     <button className='underline' onClick={() => handleLockedToken(tx)}>
                        eTip
                     </button>
                  </div>
               );
            }

            return (
               <div className='flex justify-center'>
                  {reclaiming ? (
                     <Spinner size={'sm'} />
                  ) : (
                     <button className='underline' onClick={() => handleReclaim(tx)}>
                        Reclaim
                     </button>
                  )}
               </div>
            );
         }

         return getIcon(tx);
      },
      [reclaiming, user.pubkey, tx.pubkey],
   );

   return (
      <Table.Row>
         <Table.Cell className='pe-0 md:pe-6'>{formatDate(tx.date)}</Table.Cell>
         <Table.Cell className='pe-0 md:pe-6'>
            {formatAmount(tx.amount, isEcashTransaction(tx) ? tx.fee : undefined)}
         </Table.Cell>
         <Table.Cell className='flex justify-center min-w-[116px]'>{getStatusCell(tx)}</Table.Cell>
      </Table.Row>
   );
};

export default HistoryTableRow;

import { EcashTransaction, LightningTransaction } from '@/redux/slices/HistorySlice';
import { Modal, Table } from 'flowbite-react';
import React, { useState } from 'react';
import HistoryTableRow from './HistoryTableRow';
import SendEcashModalBody from '../modals/SendEcashModalBody';
import useContacts from '@/hooks/boardwalk/useContacts';
import { PublicContact } from '@/types';
import { computeTxId } from '@/utils/cashu';

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
   const [lockedToken, setLockedToken] = useState<string>('');
   const [isSendModalOpen, setIsSendModalOpen] = useState(false);
   const [tokenLockedTo, setTokenLockedTo] = useState<PublicContact | null>(null);
   const [txid, setTxid] = useState<string | undefined>();

   const { fetchContact } = useContacts();

   const openSendEcashModal = async (tx: EcashTransaction) => {
      if (tx.pubkey) {
         const contact = await fetchContact(tx.pubkey?.slice(2));
         setTokenLockedTo(contact);
         /** Begin backwards compatibility  for < v0.2.2 */
         if (new Date(tx.date).getTime() > 1723545105975) {
            setTxid(computeTxId(tx.token));
         }
         /** End backwards compatibility  for < v0.2.2 */
      }
      setLockedToken(tx.token);
      setIsSendModalOpen(true);
   };

   const closeSendEcashModal = () => {
      setLockedToken('');
      setIsSendModalOpen(false);
   };

   return (
      <>
         <Table theme={customTheme} className='text-white'>
            <Table.Body>
               {history.map((tx: EcashTransaction | LightningTransaction, i) => (
                  <HistoryTableRow key={i} tx={tx} openSendEcashModal={openSendEcashModal} />
               ))}
            </Table.Body>
         </Table>
         <Modal show={isSendModalOpen} onClose={closeSendEcashModal}>
            <Modal.Header>
               {tokenLockedTo ? `eTip for ${tokenLockedTo.username}` : 'eTip'}
            </Modal.Header>
            <SendEcashModalBody token={lockedToken} onClose={closeSendEcashModal} txid={txid} />
         </Modal>
      </>
   );
};

export default HistoryTable;

import { EcashTransaction, LightningTransaction } from '@/redux/slices/HistorySlice';
import { Modal, Table } from 'flowbite-react';
import React, { useState } from 'react';
import HistoryTableRow from './HistoryTableRow';
import SendEcashModalBody from '../modals/SendEcashModalBody';
import useContacts from '@/hooks/boardwalk/useContacts';
import { PublicContact, GiftAsset } from '@/types';
import { computeTxId } from '@/utils/cashu';
import ViewGiftModal from '../eGifts/ViewGiftModal';
import useGifts from '@/hooks/boardwalk/useGifts';
import { txHistoryTableTheme } from '@/themes/tableThemes';

const HistoryTable: React.FC<{
   history: (EcashTransaction | LightningTransaction)[];
}> = ({ history }) => {
   const [lockedToken, setLockedToken] = useState<string>('');
   const [isSendModalOpen, setIsSendModalOpen] = useState(false);
   const [tokenLockedTo, setTokenLockedTo] = useState<PublicContact | null>(null);
   const [txid, setTxid] = useState<string | undefined>();
   const [isViewGiftModalOpen, setIsViewGiftModalOpen] = useState(false);
   const [selectedGift, setSelectedGift] = useState<GiftAsset | undefined>(undefined);

   const { fetchContact } = useContacts();
   const { fetchGift } = useGifts();

   const closeViewGiftModal = () => {
      setIsViewGiftModalOpen(false);
   };

   const openViewGiftModal = async (tx: EcashTransaction & { gift: string }) => {
      setIsViewGiftModalOpen(true);
      setIsSendModalOpen(false);
      const gift = await fetchGift(tx.gift);
      if (!gift) {
         console.error('Gift not found:', tx.gift);
         return;
      }
      setSelectedGift(gift);
      if (tx.pubkey) {
         /** Begin backwards compatibility  for < v0.2.2 */
         if (new Date(tx.date).getTime() > 1724352697905) {
            setTxid(computeTxId(tx.token));
         }
         /** End backwards compatibility  for < v0.2.2 */
         const contact = await fetchContact(tx.pubkey?.slice(2));
         setTokenLockedTo(contact);
      }
   };

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
         <Table theme={txHistoryTableTheme} className='text-white'>
            <Table.Body>
               {history.map((tx: EcashTransaction | LightningTransaction, i) => (
                  <HistoryTableRow
                     key={i}
                     tx={tx}
                     openSendEcashModal={openSendEcashModal}
                     openViewGiftModal={openViewGiftModal}
                  />
               ))}
            </Table.Body>
         </Table>
         <Modal show={isSendModalOpen} onClose={closeSendEcashModal}>
            <Modal.Header>
               {tokenLockedTo ? `eTip for ${tokenLockedTo.username}` : 'eTip'}
            </Modal.Header>
            <SendEcashModalBody token={lockedToken} onClose={closeSendEcashModal} txid={txid} />
         </Modal>
         {selectedGift && txid && (
            <ViewGiftModal
               isOpen={isViewGiftModalOpen}
               onClose={closeViewGiftModal}
               stickerPath={selectedGift.selectedSrc}
               selectedContact={tokenLockedTo}
               amountCents={selectedGift.amountCents}
               txid={txid}
            />
         )}
      </>
   );
};

export default HistoryTable;

import { useMemo, useState } from 'react';
import { Button, Modal } from 'flowbite-react';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import DiscoverContactsModalBody from '@/components/modals/DiscoverContactsModalBody';
import AuthenticateNpubModalBody from '@/components/modals/AuthenticateNpubModalBody';

const DiscoverButton = () => {
   const [showModal, setShowModal] = useState(false);
   const user = useSelector((state: RootState) => state.user);

   const handleCloseModal = () => {
      setShowModal(false);
   };

   const modalTitle = useMemo(() => {
      if (user.nostrPubkey) {
         return 'Discover Contacts';
      }
      return 'Authenticate Nostr Pubkey';
   }, [user.nostrPubkey]);

   return (
      <>
         <Button className='btn-primary' onClick={() => setShowModal(true)}>
            Discover
         </Button>
         <Modal show={showModal} onClose={handleCloseModal} className='text-black'>
            <Modal.Header>{modalTitle}</Modal.Header>
            {user.nostrPubkey ? <DiscoverContactsModalBody /> : <AuthenticateNpubModalBody />}
         </Modal>
      </>
   );
};

export default DiscoverButton;

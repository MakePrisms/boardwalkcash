import XMarkIcon from '@/components/icons/XMarkIcon';
import useContacts from '@/hooks/boardwalk/useContacts';
import { PublicContact } from '@/types';
import { Table } from 'flowbite-react';

interface ContactTableRowItemProps {
   contact: PublicContact;
   mode: 'view' | 'select';
   handleContactClick: (contact: PublicContact) => void;
   userPubkey?: string;
}

const ContactTableRowItem = ({
   contact,
   mode,
   handleContactClick,
   userPubkey,
}: ContactTableRowItemProps) => {
   const { deleteContact } = useContacts();

   const handleDeleteContact = async (e: React.MouseEvent) => {
      // Prevent the click event from propagating to the parent row
      e.stopPropagation();
      if (window.confirm('Are you sure you want to delete this contact?')) {
         deleteContact(contact);
      }
   };
   return (
      <Table.Row
         onClick={() => handleContactClick(contact)}
         className={`flex justify-between ${mode === 'select' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
      >
         <Table.Cell>{contact.username}</Table.Cell>
         {mode === 'view' && userPubkey !== contact.pubkey && (
            <Table.Cell>
               <button onClick={handleDeleteContact}>
                  <XMarkIcon className='h-5 w-5 text-red-500 hover:bg-gray-200 rounded-sm' />
               </button>
            </Table.Cell>
         )}
      </Table.Row>
   );
};

export default ContactTableRowItem;

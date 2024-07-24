import { PublicContact } from '@/types';
import { Table } from 'flowbite-react';

interface ContactTableRowItemProps {
   contact: PublicContact;
   mode: 'view' | 'select';
   handleContactClick: (contact: PublicContact) => void;
}

const ContactTableRowItem = ({ contact, mode, handleContactClick }: ContactTableRowItemProps) => {
   return (
      <Table.Row
         onClick={() => handleContactClick(contact)}
         className={mode === 'select' ? 'cursor-pointer hover:bg-gray-100' : ''}
      >
         <Table.Cell>{contact.username}</Table.Cell>
      </Table.Row>
   );
};

export default ContactTableRowItem;

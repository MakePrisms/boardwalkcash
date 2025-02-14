import { AtSign } from 'lucide-react';
import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';

type Contact = {
  id: string;
  username: string;
  address?: string;
};

const contacts: Contact[] = [
  {
    id: '1',
    username: 'Alice',
  },
  {
    id: '2',
    username: 'Bob',
    address: 'bob@lightning.address',
  },
  {
    id: '3',
    username: 'Carol',
  },
];

type TextInputDrawerProps = {
  onSubmit: (text: string) => void;
};

export function TextInputDrawer({ onSubmit }: TextInputDrawerProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>(contacts);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(text);
    setOpen(false);
    setText('');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
    setFilteredContacts(
      contacts.filter(
        (contact) =>
          contact.username.toLowerCase().includes(value.toLowerCase()) ||
          contact.address?.toLowerCase().includes(value.toLowerCase()),
      ),
    );
  };

  const handleContactSelect = (contact: Contact) => {
    setText(contact.username);
    onSubmit(contact.username);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button type="button" onClick={() => setOpen(true)}>
          <AtSign />
        </button>
      </DrawerTrigger>
      <DrawerContent className="h-[90vh]">
        <DrawerHeader>Send to User</DrawerHeader>
        <div className="flex flex-col gap-4 p-4">
          <form onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="Enter lightning or username"
              value={text}
              onChange={handleTextChange}
              autoFocus
            />
          </form>

          <div className="flex flex-col gap-2">
            {filteredContacts.map((contact) => (
              <button
                type="button"
                key={contact.id}
                onClick={() => handleContactSelect(contact)}
                className="flex flex-col items-start rounded-lg p-2 text-left hover:bg-muted"
              >
                <span className="font-medium">{contact.username}</span>
                {contact.address && (
                  <span className="text-muted-foreground text-sm">
                    {contact.address}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

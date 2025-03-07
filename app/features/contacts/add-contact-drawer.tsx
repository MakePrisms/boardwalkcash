import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { useToast } from '~/hooks/use-toast';
import { useUser } from '../user/user-hooks';
import type { Contact } from './contact';
import { ContactAvatar } from './contact-avatar';
import { useAddContact, useContacts, useSearchUsers } from './contact-hooks';
import { SearchBar } from './search-bar';

export function AddContactDrawer() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { mutateAsync: addContact } = useAddContact();
  const { toast } = useToast();

  const handleAddContact = async (username: string) => {
    try {
      await addContact({ username });
      setOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error adding contact',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="icon" variant="ghost">
          <Plus className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[90dvh] font-primary">
        <DrawerHeader className="space-y-2">
          <DrawerTitle>Add Contact</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-8 px-4">
          <SearchBar onSearch={setSearchQuery} placeholder="satoshi" />
          <SearchResults
            searchQuery={searchQuery}
            onAddContact={handleAddContact}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SearchResults({
  searchQuery,
  onAddContact,
}: {
  searchQuery: string;
  onAddContact: (username: string) => Promise<void>;
}) {
  const { results } = useSearchUsers({ partialUsername: searchQuery });
  const { contacts } = useContacts();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const userId = useUser((u) => u.id);

  if (!results || results.length === 0) {
    return (
      <div className="pt-8 text-center text-muted-foreground">
        {!results ? 'Search by username' : 'No Results'}
      </div>
    );
  }

  //  TODO: results should already be typed as Contact[]
  // TODO: improve filtering
  const filteredResults = results
    .map((user) => ({
      id: `temp-${user.username}`,
      username: user.username,
      createdAt: new Date().toISOString(),
      ownerId: '',
    }))
    .filter(
      (contact) =>
        !contacts.some((contact2) => contact.username === contact2.username),
    )
    .filter((contact) => contact.username !== userId);

  return (
    <div className="h-full">
      <ContactList
        contacts={filteredResults}
        selectedContact={selectedContact}
        onContactSelect={setSelectedContact}
      />
      {selectedContact && (
        <div className="sticky bottom-4 flex justify-center">
          <Button
            onClick={() => onAddContact(selectedContact.username)}
            className="w-fit max-w-xs"
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function ContactList({
  contacts,
  selectedContact,
  onContactSelect,
}: {
  contacts: Contact[];
  selectedContact: Contact | null;
  onContactSelect: (contact: Contact | null) => void;
}) {
  return (
    <div className="space-y-2">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="flex items-center justify-between rounded-lg transition-colors"
        >
          <SelectableContactListItem
            contact={contact}
            isSelected={selectedContact?.id === contact.id}
            onSelect={() => {
              onContactSelect(
                selectedContact?.id === contact.id ? null : contact,
              );
            }}
          />
        </div>
      ))}
    </div>
  );
}

function SelectableContactListItem({
  contact,
  isSelected,
  onSelect,
}: {
  contact: Contact;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 p-2"
      onClick={onSelect}
      type="button"
    >
      <ContactAvatar contact={contact} size="sm" />
      <span className="font-medium">{contact.username}</span>
      {isSelected && <Check className="ml-auto h-4 w-4 text-foreground" />}
    </button>
  );
}

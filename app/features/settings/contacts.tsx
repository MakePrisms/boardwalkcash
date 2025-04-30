import { useState } from 'react';
import { PageContent } from '~/components/page';
import { AddContactDrawer, ContactsList } from '~/features/contacts';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { SearchBar } from '../../components/search-bar';
import { useContacts } from '../contacts/contact-hooks';

export default function Contacts() {
  const contacts = useContacts();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter((contact) =>
    contact.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <SettingsViewHeader
        title="Contacts"
        navBack={{
          to: '/settings',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      >
        <AddContactDrawer />
      </SettingsViewHeader>
      <PageContent>
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search contacts..."
          debounceTime={0}
        />

        <ContactsList contacts={filteredContacts} />
      </PageContent>
    </>
  );
}

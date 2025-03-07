import { useState } from 'react';
import { PageContent } from '~/components/page';
import { AddContactDrawer, ContactsList } from '~/features/contacts';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { useContacts } from '../contacts/contact-hooks';
import { SearchBar, useContactFilter } from '../contacts/search-bar';

export default function Contacts() {
  const { contacts } = useContacts();
  const [searchQuery, setSearchQuery] = useState('');
  // TODO: get rid of this and make better
  const filteredContacts = useContactFilter(contacts, searchQuery);

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
        <div className="mb-4">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search contacts..."
          />
        </div>
        <ContactsList contacts={filteredContacts} />
      </PageContent>
    </>
  );
}

import { useState } from 'react';
import { PageContent } from '~/components/page';
import { AddContactDrawer, ContactsList } from '~/features/contacts';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { SearchBar } from '../../components/search-bar';
import { useContacts } from '../contacts/contact-hooks';

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    contacts,
    hasNextPage,
    fetchNextPage,
    isLoading,
    isFetchingNextPage,
  } = useContacts({
    filterFn: (contact) =>
      contact.username.toLowerCase().includes(searchQuery.toLowerCase()),
    pageSize: 20, // Load 20 contacts per page
  });

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

        <ContactsList
          contacts={contacts}
          hasMore={hasNextPage}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />
      </PageContent>
    </>
  );
}

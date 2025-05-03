import { Spinner } from '~/components/ui/spinner';
import { LinkWithViewTransition } from '~/lib/transitions';
import type { Contact } from './contact';
import { ContactAvatar } from './contact-avatar';
import { useInfiniteScroll } from './use-infinite-scroll';

type ContactsListProps = {
  contacts: Contact[];
  onClick?: (contact: Contact) => void;
  hasMore?: boolean;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
};

export function ContactsList({
  contacts,
  onClick,
  hasMore = false,
  isLoading = false,
  isFetchingNextPage = false,
  onLoadMore,
}: ContactsListProps) {
  const hasContacts = contacts.length > 0;

  // Set up infinite scrolling if onLoadMore is provided
  const { containerRef } = onLoadMore
    ? useInfiniteScroll({
        onLoadMore,
        isLoading: isLoading || isFetchingNextPage,
        hasMore: hasMore ?? false,
      })
    : { containerRef: null };

  return (
    <div ref={containerRef} className="flex flex-col gap-6 py-6">
      {hasContacts ? (
        contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center rounded-lg transition-colors"
          >
            {onClick ? (
              <button
                className="flex w-full items-center gap-3"
                onClick={() => onClick?.(contact)}
                type="button"
              >
                <ContactAvatar username={contact.username} size="sm" />
                <span className="font-medium">{contact.username}</span>
              </button>
            ) : (
              <ContactListItem contact={contact} />
            )}
          </div>
        ))
      ) : (
        <div className="text-center text-muted-foreground">
          No contacts found
        </div>
      )}

      {/* Loading indicator at the bottom of the list */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner size="md" />
        </div>
      )}

      {/* Empty div to ensure there's scrollable space */}
      {hasMore && !isFetchingNextPage && <div className="h-20" />}
    </div>
  );
}

function ContactListItem({ contact }: { contact: Contact }) {
  return (
    <LinkWithViewTransition
      to={`/settings/contacts/${contact.id}`}
      transition="slideLeft"
      applyTo="oldView"
      className="flex w-full items-center gap-3"
    >
      <ContactAvatar username={contact.username} size="sm" />
      <span className="font-medium">{contact.username}</span>
    </LinkWithViewTransition>
  );
}

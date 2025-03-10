import type { ReactNode } from 'react';
import { LinkWithViewTransition } from '~/lib/transitions';
import type { Contact } from './contact';
import { ContactAvatar } from './contact-avatar';

type ContactsListProps = {
  contacts: Contact[];
  emptyState?: ReactNode;
  onContactClick?: (contact: Contact) => void;
};

export function ContactsList({
  contacts,
  emptyState,
  onContactClick,
}: ContactsListProps) {
  const hasContacts = contacts.length > 0;
  return (
    <div className="flex flex-col gap-3 py-6">
      {hasContacts
        ? contacts.map((contact) => (
            <div
              key={contact.id}
              className=" flex items-center rounded-lg transition-colors"
            >
              {onContactClick ? (
                <button
                  className="flex w-full items-center gap-3"
                  onClick={() => onContactClick(contact)}
                  type="button"
                >
                  <ContactAvatar contact={contact} size="sm" />
                  <span className="font-medium">{contact.username}</span>
                </button>
              ) : (
                <ContactListItem contact={contact} />
              )}
            </div>
          ))
        : emptyState || (
            <div className="text-center text-muted-foreground">
              No contacts found
            </div>
          )}
    </div>
  );
}

function ContactListItem({ contact }: { contact: Contact }) {
  // QUESTION: this link will prefetch the contact page... not sure if that's what we want because we are effectivley
  // fetching the list of contacts and then each individual contact
  return (
    <LinkWithViewTransition
      to={`/settings/contacts/${contact.id}`}
      transition="slideLeft"
      applyTo="oldView"
      className="flex w-full items-center gap-3"
    >
      <ContactAvatar contact={contact} size="sm" />
      <span className="font-medium">{contact.username}</span>
    </LinkWithViewTransition>
  );
}

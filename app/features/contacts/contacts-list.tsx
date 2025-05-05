import { LinkWithViewTransition } from '~/lib/transitions';
import type { Contact } from './contact';
import { ContactAvatar } from './contact-avatar';

type ContactsListProps = {
  contacts: Contact[];
};

export function ContactsList({ contacts }: ContactsListProps) {
  const hasContacts = contacts.length > 0;

  return (
    <div className="flex flex-col gap-6 py-6">
      {hasContacts ? (
        contacts.map((contact) => (
          <div
            key={contact.id}
            className=" flex items-center rounded-lg transition-colors"
          >
            <LinkWithViewTransition
              to={`/settings/contacts/${contact.id}`}
              transition="slideLeft"
              applyTo="oldView"
              className="flex w-full items-center gap-3"
            >
              <ContactAvatar username={contact.username} size="sm" />
              <span className="font-medium">{contact.username}</span>
            </LinkWithViewTransition>{' '}
          </div>
        ))
      ) : (
        <div className="text-center text-muted-foreground">
          No contacts found
        </div>
      )}
    </div>
  );
}

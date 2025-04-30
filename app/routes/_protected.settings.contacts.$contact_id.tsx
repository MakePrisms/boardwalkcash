import { Page } from '~/components/page';
import { SingleContact } from '~/features/settings/contact';
import type { Route } from './+types/_protected.settings.contacts.$contact_id';

export default function ContactsPage({ params }: Route.ComponentProps) {
  const contactId = params.contact_id;

  return (
    <Page>
      <SingleContact contactId={contactId} />
    </Page>
  );
}

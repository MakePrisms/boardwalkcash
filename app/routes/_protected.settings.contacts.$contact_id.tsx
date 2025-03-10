import { useParams } from '@remix-run/react';
import { Page } from '~/components/page';
import { SingleContact } from '~/features/settings/contact';

export default function ContactsPage() {
  const { contact_id: contactId } = useParams();

  if (!contactId) {
    throw new Error('No contact id found in route params');
  }

  return (
    <Page>
      <SingleContact contactId={contactId} />
    </Page>
  );
}

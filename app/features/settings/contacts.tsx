import { PageContent } from '~/components/page';
import { SettingsViewHeader } from './components/settings-view-header';

export default function Contacts() {
  return (
    <>
      <SettingsViewHeader
        title="Contacts"
        navBack={{
          to: '/settings',
          direction: 'right',
          type: 'close',
        }}
      />
      <PageContent>
        <div>
          <p>Contacts</p>
        </div>
      </PageContent>
    </>
  );
}

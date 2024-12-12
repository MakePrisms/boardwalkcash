import { PageContent } from '~/components/page';
import { SettingsViewHeader } from './components/settings-view-header';

export default function Contacts() {
  return (
    <>
      <SettingsViewHeader title="Contacts" />
      <PageContent>
        <div>
          <p>Contacts</p>
        </div>
      </PageContent>
    </>
  );
}

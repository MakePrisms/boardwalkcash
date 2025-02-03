import { PageContent } from '~/components/page';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';

export default function Contacts() {
  return (
    <>
      <SettingsViewHeader
        title="Contacts"
        navBack={{
          to: '/settings',
          transition: 'slideRight',
          applyTo: 'oldView',
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

import { PageContent } from '~/components/page';
import { AddMintForm } from '~/features/settings/accounts/add-mint-form';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';

export default function AddCashuAccountView() {
  return (
    <>
      <SettingsViewHeader
        title="Create Cashu Account"
        navBack={{
          to: '/settings/accounts',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        <AddMintForm unit="sat" />
      </PageContent>
    </>
  );
}

import { PageContent } from '~/components/page';
import { AddMintForm } from '~/features/settings/components/add-mint-form';
import { SettingsViewHeader } from '../components/settings-view-header';

export default function AddCashuAccountView() {
  return (
    <>
      <SettingsViewHeader
        title="Create Cashu Account"
        navBack={{
          to: '/settings/accounts',
          direction: 'right',
          type: 'close',
        }}
      />
      <PageContent>
        <AddMintForm unit="sat" />
      </PageContent>
    </>
  );
}

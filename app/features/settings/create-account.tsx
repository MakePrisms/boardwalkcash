import { PageContent } from '~/components/page';
import { SettingsNavButton } from '~/features/settings/components/settings-nav-button';
import { SettingsViewHeader } from '~/features/settings/components/settings-view-header';

export default function CreateAccount() {
  return (
    <>
      <SettingsViewHeader
        title="Add Account"
        navBack={{
          to: '/settings',
          direction: 'right',
          type: 'close',
        }}
      />
      <PageContent>
        <div className="grid gap-4">
          <SettingsNavButton to="/settings/accounts/create/spark">
            <span>Spark Wallet</span>
          </SettingsNavButton>

          <SettingsNavButton to="/settings/accounts/create/nwc">
            <span>NWC Wallet</span>
          </SettingsNavButton>

          <SettingsNavButton to="/settings/accounts/create/cashu">
            <span>Cashu Mint</span>
          </SettingsNavButton>
        </div>
      </PageContent>
    </>
  );
}

import { PageContent } from '~/components/page';
import { SettingsNavButton } from '~/features/settings/ui/settings-nav-button';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';

export default function CreateAccount() {
  return (
    <>
      <SettingsViewHeader
        title="Add Account"
        navBack={{
          to: '/settings/accounts',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        <div className="grid gap-4">
          <SettingsNavButton to="/settings/accounts/create/cashu">
            <span>Cashu Mint</span>
          </SettingsNavButton>

          <SettingsNavButton to="/settings/accounts/create/spark">
            <span>Spark Wallet</span>
          </SettingsNavButton>

          <SettingsNavButton to="/settings/accounts/create/nwc">
            <span>NWC Wallet</span>
          </SettingsNavButton>
        </div>
      </PageContent>
    </>
  );
}

import { PageContent } from '~/components/page';
import { Separator } from '~/components/ui/separator';
import { SettingsNavButton } from './components/settings-nav-button';
import { SettingsViewHeader } from './components/settings-view-header';

export default function AdvancedSettings() {
  return (
    <>
      <SettingsViewHeader
        title="Advanced Settings"
        navBack={{
          to: '/settings',
          direction: 'right',
          type: 'close',
        }}
      />

      <PageContent>
        <div className="text-lg">
          Note: just randomly generated stuff here, but its the idea that counts
        </div>
        <SettingsNavButton to="/settings">
          <p>Network Settings</p>
        </SettingsNavButton>

        <SettingsNavButton to="/settings">
          <p>Debug Information</p>
        </SettingsNavButton>

        <Separator />

        <div className="space-y-2">
          <h3 className="px-4 font-medium text-destructive text-sm">
            DANGER ZONE
          </h3>

          <SettingsNavButton variant="destructive" to="/settings">
            <p>Reset All Settings</p>
          </SettingsNavButton>

          <SettingsNavButton variant="destructive" to="/settings">
            <p>Delete All Data</p>
          </SettingsNavButton>
        </div>
      </PageContent>
    </>
  );
}

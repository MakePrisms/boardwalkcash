import { SidebarContent, SidebarSeparator } from '~/components/ui/sidebar';
import { SettingsNavButton } from '../components/settings-nav-button';
import { SettingsViewHeader } from '../components/settings-view-header';

export default function AdvancedSettingsView() {
  return (
    <>
      <SettingsViewHeader title="Advanced Settings" />

      <SidebarContent>
        <div className="text-lg">
          Note: just randomly generated stuff here, but its the idea that counts
        </div>
        <SettingsNavButton to="/settings">
          <p>Network Settings</p>
        </SettingsNavButton>

        <SettingsNavButton to="/settings">
          <p>Debug Information</p>
        </SettingsNavButton>

        <SidebarSeparator />

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
      </SidebarContent>
    </>
  );
}

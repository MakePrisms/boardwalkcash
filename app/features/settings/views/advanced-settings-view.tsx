import { SidebarContent, SidebarSeparator } from '~/components/ui/sidebar';
import { SettingsNavButton } from '../components/settings-nav-button';
import { SettingsViewHeader } from '../components/settings-view-header';
import { useSettingsSidebar } from '../settings-sidebar-provider';

export function AdvancedSettingsView() {
  const { navigateToView } = useSettingsSidebar();

  return (
    <>
      <SettingsViewHeader title="Advanced Settings" />

      <SidebarContent>
        <div className="text-lg">
          Note: just randomly generated stuff here, but its the idea that counts
        </div>
        <SettingsNavButton onNavigate={() => navigateToView('main')}>
          <p>Network Settings</p>
        </SettingsNavButton>

        <SettingsNavButton onNavigate={() => navigateToView('main')}>
          <p>Debug Information</p>
        </SettingsNavButton>

        <SidebarSeparator />

        <div className="space-y-2">
          <h3 className="px-4 font-medium text-destructive text-sm">
            DANGER ZONE
          </h3>

          <SettingsNavButton
            variant="destructive"
            onNavigate={() => navigateToView('main')}
          >
            <p>Reset All Settings</p>
          </SettingsNavButton>

          <SettingsNavButton
            variant="destructive"
            onNavigate={() => navigateToView('main')}
          >
            <p>Delete All Data</p>
          </SettingsNavButton>
        </div>
      </SidebarContent>
    </>
  );
}

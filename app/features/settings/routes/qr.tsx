import { SidebarContent, SidebarFooter } from '~/components/ui/sidebar';
import { SettingsViewHeader } from '../components/settings-view-header';

export default function QrView() {
  // TODO: Get actual username and profile URL from user context
  const username = 'username';

  return (
    <>
      <SettingsViewHeader title="Scan QR Code" />
      <SidebarContent>
        <div className="flex flex-col items-center gap-6 p-4">
          <h2 className="font-semibold text-xl">@{username}</h2>
          <div className="rounded-lg p-4">QR Code</div>
          <p className="text-center text-muted-foreground text-sm">
            Scan to view profile
          </p>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="text-center text-sidebar-foreground/70 text-xs">
          Share your profile with others
        </div>
      </SidebarFooter>
    </>
  );
}

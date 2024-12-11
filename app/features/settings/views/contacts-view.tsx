import { SidebarContent } from '~/components/ui/sidebar';
import { SettingsViewHeader } from '../components/settings-view-header';

export function ContactsView() {
  return (
    <>
      <SettingsViewHeader title="Scan QR Code" />
      <SidebarContent>All you contacts</SidebarContent>
    </>
  );
}

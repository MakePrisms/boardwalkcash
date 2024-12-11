import { Outlet } from '@remix-run/react';
import { SettingsSidebar } from '~/features/settings/settings-sidebar';

export default function PublicRoute() {
  return (
    <SettingsSidebar>
      <Outlet />
    </SettingsSidebar>
  );
}

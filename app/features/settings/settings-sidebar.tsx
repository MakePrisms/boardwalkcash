import { Settings } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from '~/components/ui/sidebar';
import { AccountMenu } from './account-menu';

export function SettingsSidebar() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex">
        <div className="flex-1" />
        <SidebarTrigger>
          <Settings className="size-4" />
        </SidebarTrigger>
        <Sidebar side="right" variant="floating">
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Settings className="size-4" />
              <span className="font-medium">Settings</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <AccountMenu />
          </SidebarContent>
          <SidebarFooter>
            <div className="text-sidebar-foreground/70 text-xs">
              Lorem, ipsum{' '}
            </div>
          </SidebarFooter>
        </Sidebar>
      </div>
    </SidebarProvider>
  );
}

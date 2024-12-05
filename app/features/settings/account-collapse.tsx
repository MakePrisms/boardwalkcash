import { ChevronDown, Plus, User } from 'lucide-react';
import * as React from 'react';

import { Button } from '~/components/ui/button';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '~/components/ui/sidebar';
import { useSettings } from './use-settings';

export function AccountCollapse() {
  const [open, setOpen] = React.useState(false);
  const { addAccount } = useSettings();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => setOpen(!open)}>
          <User className="size-4" />
          <span>Accounts</span>
          <ChevronDown
            className={`ml-auto size-4 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </SidebarMenuButton>
        {open && (
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton>Profile</SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={addAccount}
              >
                <Plus />
                <span>Add Account</span>
              </Button>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

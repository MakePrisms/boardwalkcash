import type { MetaFunction } from '@remix-run/node';
import { Button } from '~/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '~/components/ui/sidebar';

export const meta: MetaFunction = () => {
  return [
    { title: 'Boardwalk' },
    { name: 'description', content: 'Welcome to Boardwalk!' },
  ];
};

export default function Index() {
  return (
    <div>
      <h1>Welcome to Boardwalk!</h1>
      <div className="flex flex-row gap-2">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="link">Link</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <div className="h-svh">
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <h2 className="px-4 font-semibold text-lg">Boardwalk</h2>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Dashboard</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>Settings</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <div className="px-4 py-2">
                <SidebarTrigger />
              </div>
            </SidebarFooter>
          </Sidebar>
          <main className="ml-[--sidebar-width] p-4">
            {/* Main content goes here */}
          </main>
        </SidebarProvider>
      </div>
    </div>
  );
}

import { Edit, Landmark, QrCode, Share, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from '~/components/ui/sidebar';
import { formatUnit } from '~/lib/formatting';
import { canShare, shareContent } from '~/lib/share';
import { SettingsNavButton } from '../components/settings-nav-button';
import { useSettingsSidebar } from '../settings-sidebar-provider';

const username = 'satoshi';
const activeMintName = 'Coinos';
const activeMintBalance = 10_000;
const activeMintUnit = 'usd';

export function MainView() {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const { navigateToView } = useSettingsSidebar();

  const handleShare = async () => {
    const data = {
      title: `${username}'s Boardwalk`,
      url: `https://boardwalkcash.com/${username}`,
    };
    await shareContent(data);
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (isMobile ? setOpenMobile(false) : setOpen(false))}
          >
            <X />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateToView('qr')}
            >
              <QrCode />
            </Button>
            {canShare() && (
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share />
              </Button>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="font-semibold text-2xl">{username}</div>
          <SettingsNavButton onNavigate={() => navigateToView('edit-profile')}>
            <Edit />
            <span>Edit profile</span>
          </SettingsNavButton>
          <SettingsNavButton onNavigate={() => navigateToView('all-accounts')}>
            <Landmark /> {activeMintName}{' '}
            {formatUnit(activeMintBalance, activeMintUnit)}
          </SettingsNavButton>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SettingsNavButton onNavigate={() => navigateToView('appearance')}>
            Appearance
          </SettingsNavButton>
          <SettingsNavButton onNavigate={() => navigateToView('contacts')}>
            Contacts
          </SettingsNavButton>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SettingsNavButton
            onNavigate={() => navigateToView('advanced')}
            variant="destructive"
          >
            Advanced
          </SettingsNavButton>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="text-sidebar-foreground/70 text-xs">
          Insert terms and conditions here
        </div>
      </SidebarFooter>
    </>
  );
}

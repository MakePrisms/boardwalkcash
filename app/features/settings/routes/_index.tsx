import { useNavigate } from '@remix-run/react';
import { Edit, Landmark, QrCode, Share, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
} from '~/components/ui/sidebar';
import { formatUnit } from '~/lib/formatting';
import { canShare, shareContent } from '~/lib/share';
import { SettingsNavButton } from '../components/settings-nav-button';

const username = 'satoshi';
const activeMintName = 'Coinos';
const activeMintBalance = 10_000;
const activeMintUnit = 'usd';

export default function MainView() {
  const navigate = useNavigate();
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <X />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings/qr')}
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
          <SettingsNavButton to="/settings/profile/edit">
            <Edit />
            <span>Edit profile</span>
          </SettingsNavButton>
          <SettingsNavButton to="/settings/accounts">
            <Landmark /> {activeMintName}{' '}
            {formatUnit(activeMintBalance, activeMintUnit)}
          </SettingsNavButton>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SettingsNavButton to="/settings/appearance">
            Appearance
          </SettingsNavButton>
          <SettingsNavButton to="/settings/contacts">
            Contacts
          </SettingsNavButton>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SettingsNavButton to="/settings/advanced" variant="destructive">
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

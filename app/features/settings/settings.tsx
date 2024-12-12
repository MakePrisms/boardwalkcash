import { Edit, Landmark, QrCode, Share, X } from 'lucide-react';
import { PageContent, PageFooter, PageHeader } from '~/components/page';
import { Separator } from '~/components/ui/separator';
import { AnimatedLink } from '~/lib/animated-navigation';
import { formatUnit } from '~/lib/formatting';
import { canShare, shareContent } from '~/lib/share';
import { SettingsNavButton } from './components/settings-nav-button';

const username = 'satoshi';
const activeMintName = 'Coinos';
const activeMintBalance = 10_000;
const activeMintUnit = 'usd';

export default function Settings() {
  const handleShare = async () => {
    const data = {
      title: `${username}'s Boardwalk`,
      url: `https://boardwalkcash.com/${username}`,
    };
    await shareContent(data);
  };

  return (
    <>
      <PageHeader>
        <div className="flex items-center justify-between">
          <AnimatedLink to="/" direction="right">
            <X />
          </AnimatedLink>
          <div className="flex items-center gap-2">
            <AnimatedLink to="/settings/qr" direction="left">
              <QrCode />
            </AnimatedLink>
            {canShare() && (
              <button type="button" onClick={handleShare}>
                <Share />
              </button>
            )}
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <div className="font-semibold text-2xl">{username}</div>
        <SettingsNavButton to="/settings/profile/edit">
          <Edit />
          <span>Edit profile</span>
        </SettingsNavButton>
        <SettingsNavButton to="/settings/accounts">
          <Landmark /> {activeMintName}{' '}
          {formatUnit(activeMintBalance, activeMintUnit)}
        </SettingsNavButton>

        <Separator />

        <SettingsNavButton to="/settings/appearance">
          Appearance
        </SettingsNavButton>
        <SettingsNavButton to="/settings/contacts">Contacts</SettingsNavButton>
        <Separator />
        <SettingsNavButton to="/settings/advanced" variant="destructive">
          Advanced
        </SettingsNavButton>
      </PageContent>

      <PageFooter>
        <div className="text-sidebar-foreground/70 text-xs">
          Insert terms and conditions here
        </div>
      </PageFooter>
    </>
  );
}

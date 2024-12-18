import { Edit, Landmark, QrCode, Share } from 'lucide-react';
import {
  ClosePageButton,
  PageContent,
  PageFooter,
  PageHeader,
} from '~/components/page';
import { Separator } from '~/components/ui/separator';
import { formatUnit } from '~/lib/formatting';
import { canShare, shareContent } from '~/lib/share';
import { LinkWithViewTransition } from '~/lib/transitions';
import { SettingsNavButton } from './components/settings-nav-button';

const username = 'satoshi';
const activeMintName = 'Coinos';
const activeMintBalance = 10_000;
const activeMintUnit = 'cent';

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
        <ClosePageButton to="/" transition="slideRight" applyTo="oldView" />
        <LinkWithViewTransition
          to="/settings/qr"
          transition="slideUp"
          applyTo="newView"
        >
          <QrCode />
        </LinkWithViewTransition>
        {canShare() && (
          <button type="button" onClick={handleShare}>
            <Share />
          </button>
        )}
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

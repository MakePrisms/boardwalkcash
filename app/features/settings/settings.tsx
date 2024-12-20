import { Edit, Landmark, QrCode, Share, X } from 'lucide-react';
import { PageContent, PageFooter, PageHeader } from '~/components/page';
import { Separator } from '~/components/ui/separator';
import { Money } from '~/lib/money';
import { canShare, shareContent } from '~/lib/share';
import { LinkWithViewTransition } from '~/lib/transitions';
import { SettingsNavButton } from './components/settings-nav-button';

const username = 'satoshi';
const activeMintName = 'Coinos';
const activeMintBalance = 10_000;

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
          <LinkWithViewTransition
            to="/"
            transition="slideRight"
            applyTo="oldView"
          >
            <X />
          </LinkWithViewTransition>
          <div className="flex items-center gap-2">
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
          <p>
            {Money.create({
              amount: activeMintBalance,
              currency: 'USD',
            }).toLocaleString({ subunit: true })}
          </p>
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

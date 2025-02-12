import { Edit, QrCode, Share } from 'lucide-react';
import {
  ClosePageButton,
  PageContent,
  PageFooter,
  PageHeader,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { SettingsNavButton } from '~/features/settings/ui/settings-nav-button';
import { canShare, shareContent } from '~/lib/share';
import { LinkWithViewTransition } from '~/lib/transitions';
import { AccountSelector } from '../accounts/account-selector';
import { useAccounts } from '../accounts/use-accounts';
import { useAuthActions } from '../user/auth';

const username = 'satoshi';

export default function Settings() {
  const { signOut } = useAuthActions();

  const { data: accounts } = useAccounts();

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

        <AccountSelector
          accounts={accounts}
          onSelect={console.log}
          selectedAccount={accounts[0]}
        />

        <Separator />

        <SettingsNavButton to="/settings/accounts">Accounts</SettingsNavButton>
        <SettingsNavButton to="/settings/appearance">
          Appearance
        </SettingsNavButton>
        <SettingsNavButton to="/settings/contacts">Contacts</SettingsNavButton>

        <Separator />

        <Button onClick={signOut}>Sign Out</Button>
      </PageContent>

      <PageFooter>
        <div className="text-sidebar-foreground/70 text-xs">
          Insert terms and conditions here
        </div>
      </PageFooter>
    </>
  );
}

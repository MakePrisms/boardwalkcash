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
import { useDefaultAccount } from '../accounts/account-hooks';
import { AccountTypeIcon } from '../accounts/account-icons';
import { useAuthActions } from '../user/auth';
import { useUserProfile } from '../user/user-hooks';

export default function Settings() {
  const { signOut } = useAuthActions();
  const defaultAccount = useDefaultAccount();
  const { username } = useUserProfile();

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
          <AccountTypeIcon type={defaultAccount.type} />
          <span>{defaultAccount.name}</span>
        </SettingsNavButton>

        <Separator />

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

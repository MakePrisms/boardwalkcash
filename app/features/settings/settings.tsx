import { Edit, QrCode, Share, Users } from 'lucide-react';
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
import { ColorModeToggle } from '../theme/color-mode-toggle';
import { useAuthActions } from '../user/auth';
import { useUser } from '../user/user-hooks';

export default function Settings() {
  const { signOut } = useAuthActions();
  const defaultAccount = useDefaultAccount();
  const username = useUser((s) => s.username);

  const handleShare = async () => {
    const data = {
      title: `${username}'s Agicash`,
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

        <SettingsNavButton to="/settings/contacts">
          <Users />
          Contacts
        </SettingsNavButton>

        <Separator />

        <div className="flex items-center justify-between px-1 py-2">
          <span>Theme</span>
          <ColorModeToggle />
        </div>
      </PageContent>

      <PageFooter>
        <Button className="mx-auto mb-8 w-32" onClick={signOut}>
          Sign Out
        </Button>
        <div className="flex w-full flex-col items-center gap-2 text-sidebar-foreground/70 text-xs">
          <div className="flex justify-between gap-4">
            <LinkWithViewTransition
              to="/terms"
              className="hover:underline"
              transition="slideUp"
              applyTo="newView"
            >
              Terms
            </LinkWithViewTransition>
            <LinkWithViewTransition
              to="/privacy"
              className="hover:underline"
              transition="slideUp"
              applyTo="newView"
            >
              Privacy
            </LinkWithViewTransition>
          </div>
          <div className="flex gap-4">
            <a
              href="https://x.com/boardwalkcash"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              X
            </a>
            <a
              href="https://njump.me/nprofile1qqsw3u8v7rz83txuy8nc0eth6rsqh4z935fs3t6ugwc7364gpzy5psce64r7c"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Nostr
            </a>
            <a
              href="https://github.com/MakePrisms/boardwalkcash"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/boardwalkcash"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Discord
            </a>
          </div>
          <a href="mailto:contact@agi.cash" className="hover:underline">
            contact@agi.cash
          </a>
        </div>
      </PageFooter>
    </>
  );
}

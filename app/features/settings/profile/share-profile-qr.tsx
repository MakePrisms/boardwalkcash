import { PageContent, PageFooter } from '~/components/page';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { useUserStore } from '~/features/user/user-provider';

export default function ProfileQR() {
  // TODO: Get actual username and profile URL from user context
  const username = useUserStore((state) => state.user.username);
  const lightningAddress = `${username}@${new URL(window.location.origin).host}`;

  return (
    <>
      <SettingsViewHeader
        title="Scan QR Code"
        navBack={{
          to: '/settings',
          transition: 'slideDown',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        <div className="flex flex-col items-center gap-6 p-4">
          <h2 className="font-semibold text-xl">@{username}</h2>
          <div className="rounded-lg p-4">QR Code</div>
          <p className="text-center text-muted-foreground text-sm">
            Scan to view profile
          </p>
          <p className="text-center text-muted-foreground text-sm">
            {lightningAddress}
          </p>
        </div>
      </PageContent>
      <PageFooter>
        <div className="text-center text-sidebar-foreground/70 text-xs">
          Share your profile with others
        </div>
      </PageFooter>
    </>
  );
}

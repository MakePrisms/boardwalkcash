import { PageContent } from '~/components/page';
import { Separator } from '~/components/ui/separator';
import { UpgradeGuestForm } from '~/features/settings/profile/upgrade-guest-form';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { useUserStore } from '~/features/user/user-provider';
import EditableUsername from './editable-username';

export default function EditProfile() {
  const isGuest = useUserStore((s) => s.user.isGuest);

  return (
    <>
      <SettingsViewHeader
        title="Edit Profile"
        navBack={{
          to: '/settings',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent className="gap-6">
        <EditableUsername />
        {isGuest && (
          <>
            <Separator />
            <UpgradeGuestForm />
          </>
        )}
      </PageContent>
    </>
  );
}

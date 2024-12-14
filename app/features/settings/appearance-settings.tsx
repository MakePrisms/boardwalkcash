import { PageContent } from '~/components/page';
import { SettingsViewHeader } from '~/features/settings/components/settings-view-header';
import { ColorModeToggle } from '~/features/theme/color-mode-toggle';
import { useTheme } from '~/features/theme/use-theme';

export default function AppearanceSettings() {
  const { colorMode } = useTheme();

  return (
    <>
      <SettingsViewHeader
        title="Appearance"
        navBack={{
          to: '/settings',
          direction: 'right',
          type: 'close',
        }}
      />
      <PageContent>
        <p>Theme: {colorMode}</p>
        <ColorModeToggle />
      </PageContent>
    </>
  );
}

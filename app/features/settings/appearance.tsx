import { PageContent } from '~/components/page';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
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
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        <p>Theme: {colorMode}</p>
        <ColorModeToggle />
      </PageContent>
    </>
  );
}

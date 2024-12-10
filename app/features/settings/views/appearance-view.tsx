import { SidebarContent } from '~/components/ui/sidebar';
import { ColorModeToggle } from '~/features/theme/color-mode-toggle';
import { useTheme } from '~/features/theme/use-theme';
import { SettingsViewHeader } from '../components/settings-view-header';

export function AppearanceView() {
  const { colorMode } = useTheme();

  return (
    <>
      <SettingsViewHeader title="Appearance" />
      <SidebarContent>
        <p>Theme: {colorMode}</p>
        <ColorModeToggle />
      </SidebarContent>
    </>
  );
}

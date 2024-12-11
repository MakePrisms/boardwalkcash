import { ChevronLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { SidebarHeader } from '~/components/ui/sidebar';
import { useSettingsSidebar } from '../settings-sidebar-provider';

export const SettingsViewHeader = ({ title }: { title: string }) => {
  const { goBack } = useSettingsSidebar();

  return (
    <SidebarHeader>
      <div className="relative flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="absolute left-0"
        >
          <ChevronLeft />
        </Button>
        <h2 className="w-full text-center font-semibold text-lg">{title}</h2>
      </div>
    </SidebarHeader>
  );
};

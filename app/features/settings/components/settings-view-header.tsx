import { useNavigate } from '@remix-run/react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { SidebarHeader } from '~/components/ui/sidebar';

export const SettingsViewHeader = ({ title }: { title: string }) => {
  const navigate = useNavigate();
  return (
    <SidebarHeader>
      <div className="relative flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft />
        </Button>
        <h2 className="w-full text-center font-semibold text-lg">{title}</h2>
      </div>
    </SidebarHeader>
  );
};

import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '~/components/page';
import { ViewTransition } from '~/lib/view-transition';

export const SettingsViewHeader = ({ title }: { title: string }) => {
  return (
    <PageHeader>
      <div className="relative flex items-center">
        <ViewTransition back>
          <ChevronLeft />
        </ViewTransition>
        <h2 className="w-full text-center font-semibold text-lg">{title}</h2>
      </div>
    </PageHeader>
  );
};

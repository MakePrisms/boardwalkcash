import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '~/components/page';
import { AnimatedLink } from '~/lib/animated-navigation';

export const SettingsViewHeader = ({ title }: { title: string }) => {
  return (
    <PageHeader>
      <div className="relative flex items-center">
        <AnimatedLink to="/settings" direction="right">
          <ChevronLeft />
        </AnimatedLink>
        <h2 className="w-full text-center font-semibold text-lg">{title}</h2>
      </div>
    </PageHeader>
  );
};

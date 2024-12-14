import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '~/components/page';
import {
  type ApplyTo,
  type Transition,
  ViewTransition,
} from '~/lib/transitions';

export const SettingsViewHeader = ({
  title,
  navBack,
}: {
  title: string;
  navBack: {
    to: string;
    transition: Transition;
    applyTo?: ApplyTo;
  };
}) => {
  return (
    <PageHeader>
      <div className="relative flex items-center">
        <ViewTransition {...navBack}>
          <ChevronLeft />
        </ViewTransition>
        <h2 className="w-full text-center font-semibold text-lg">{title}</h2>
      </div>
    </PageHeader>
  );
};

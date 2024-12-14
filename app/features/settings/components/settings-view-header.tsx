import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '~/components/page';
import {
  type TransitionDirection,
  type TransitionStyle,
  type TransitionType,
  ViewTransition,
} from '~/lib/view-transition';

export const SettingsViewHeader = ({
  title,
  navBack,
}: {
  title: string;
  navBack: {
    to: string;
    direction: TransitionDirection;
    type: TransitionType;
    style?: TransitionStyle;
  };
}) => {
  return (
    <PageHeader>
      <div className="relative flex items-center">
        <ViewTransition
          direction={navBack.direction}
          type={navBack.type}
          style={navBack.style ?? 'static'}
          to={navBack.to}
        >
          <ChevronLeft />
        </ViewTransition>
        <h2 className="w-full text-center font-semibold text-lg">{title}</h2>
      </div>
    </PageHeader>
  );
};

import {
   BellAlertIcon as HeroBellAlertIcon,
   BellIcon as HeroBellIcon,
} from '@heroicons/react/24/outline';

export const BellIcon = ({ className }: { className?: string }) => (
   <HeroBellIcon className={`w-6 h-6 text-white `} />
);

export const BellAlertIcon = ({ className }: { className?: string }) => (
   <HeroBellAlertIcon className={`w-6 h-6 text-white `} />
);

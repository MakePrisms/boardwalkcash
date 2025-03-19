import { LandmarkIcon, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AccountType } from './account';

const CashuIcon = ({ size = 16 }: { size?: number }) => (
  <LandmarkIcon size={size} />
);
const NWCIcon = ({ size = 16 }: { size?: number }) => <Zap size={size} />;

const iconsByAccountType: Record<
  AccountType,
  (props: { size?: number }) => ReactNode
> = {
  cashu: CashuIcon,
  nwc: NWCIcon,
};

export function AccountTypeIcon({
  type,
  size,
}: { type: AccountType; size?: number }) {
  const IconComponent = iconsByAccountType[type];
  return <IconComponent size={size} />;
}

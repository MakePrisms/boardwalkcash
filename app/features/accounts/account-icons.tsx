import { LandmarkIcon, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AccountType } from './account';

const CashuIcon = () => <LandmarkIcon className="h-4 w-4" />;
const NWCIcon = () => <Zap className="h-4 w-4" />;

const iconsByAccountType: Record<AccountType, ReactNode> = {
  cashu: <CashuIcon />,
  nwc: <NWCIcon />,
};

export const getAccountIcon = (type: AccountType) => {
  return iconsByAccountType[type];
};

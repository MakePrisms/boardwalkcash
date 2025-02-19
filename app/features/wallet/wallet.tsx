import {} from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useAccounts } from '../accounts/use-accounts';

export const Wallet = ({ children }: PropsWithChildren) => {
  const { data: accounts } = useAccounts();

  if (!accounts.length) {
    return (
      <div className="flex h-screen w-full items-center justify-center px-4">
        <div>Setting up wallet...</div>
      </div>
    );
  }

  return children;
};

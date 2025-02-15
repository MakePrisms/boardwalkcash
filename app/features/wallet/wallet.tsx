import {} from '@tanstack/react-query';
import { type PropsWithChildren, useEffect } from 'react';
import { useAccounts, useAddAccounts } from '../accounts/use-accounts';

const defaultAccounts = [
  {
    type: 'cashu',
    currency: 'USD',
    name: 'Default USD Account',
    mintUrl: 'https://mint.lnvoltz.com/',
    isTestMint: false,
  },
  {
    type: 'cashu',
    currency: 'BTC',
    name: 'Default BTC Account',
    mintUrl: 'https://mint.lnvoltz.com/',
    isTestMint: false,
  },
] as const;

export const Wallet = ({ children }: PropsWithChildren) => {
  const { data: accounts } = useAccounts();
  const addAccounts = useAddAccounts();

  useEffect(() => {
    if (accounts.length === 0) {
      addAccounts([...defaultAccounts]);
    }
  }, [accounts.length, addAccounts]);

  if (!accounts.length) {
    return (
      <div className="flex h-screen w-full items-center justify-center px-4">
        <div>Setting up wallet...</div>
      </div>
    );
  }

  return children;
};

import { Outlet } from '@remix-run/react';
import { useAccounts } from '~/features/accounts/use-accounts';
import { ReceiveProvider } from '~/features/receive';

export default function ReceiveLayout() {
  const { data: accounts } = useAccounts();
  const defaultAccount = accounts[0];

  return (
    <ReceiveProvider initialAccount={defaultAccount}>
      <Outlet />
    </ReceiveProvider>
  );
}

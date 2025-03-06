import { Outlet } from '@remix-run/react';
import { useDefaultAccount } from '~/features/accounts/account-hooks';
import { ReceiveProvider } from '~/features/receive';

export default function ReceiveLayout() {
  const defaultAccount = useDefaultAccount();

  return (
    <ReceiveProvider initialAccount={defaultAccount}>
      <Outlet />
    </ReceiveProvider>
  );
}

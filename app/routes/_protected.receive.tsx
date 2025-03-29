import { Outlet } from 'react-router';
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

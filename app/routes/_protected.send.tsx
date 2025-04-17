import { Outlet } from 'react-router';
import { useAccounts } from '~/features/accounts/account-hooks';
import { SendProvider } from '~/features/send/send-provider';

export default function SendLayout() {
  const { data: accounts } = useAccounts();
  const defaultAccount = accounts[0];

  return (
    <SendProvider initialAccount={defaultAccount}>
      <Outlet />
    </SendProvider>
  );
}

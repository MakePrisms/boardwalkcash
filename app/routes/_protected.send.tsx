import { Outlet } from 'react-router';
import { useDefaultAccount } from '~/features/accounts/account-hooks';
import { SendProvider } from '~/features/send/send-provider';

export default function SendLayout() {
  const defaultAccount = useDefaultAccount();

  return (
    <SendProvider initialAccount={defaultAccount}>
      <Outlet />
    </SendProvider>
  );
}

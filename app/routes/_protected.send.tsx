import { Outlet } from '@remix-run/react';
import { useAccounts } from '~/features/accounts/use-accounts';
import { SendProvider } from '~/features/send/send-provider';

export default function SendLayout() {
  const { data: accounts } = useAccounts();
  const defaultAccount = accounts?.[0];

  return (
    <SendProvider initialAccount={defaultAccount}>
      <Outlet />
    </SendProvider>
  );
}

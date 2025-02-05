import { Outlet } from '@remix-run/react';
import { ReceiveProvider } from '~/features/receive';
import { accounts } from './_protected._index';

const defaultAccount = accounts[0];

export default function ReceiveLayout() {
  return (
    <ReceiveProvider initialAccount={defaultAccount}>
      <Outlet />
    </ReceiveProvider>
  );
}

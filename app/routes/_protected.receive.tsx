import type { LoaderFunction } from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { ReceiveProvider } from '~/features/receive';
import { exchangeRateService } from '~/lib/exchange-rate';
import { accounts } from './_protected._index';

const defaultAccount = accounts[0];

export const loader: LoaderFunction = async () => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['exchangeRate'],
    queryFn: ({ signal }) =>
      exchangeRateService.getRates({ tickers: ['BTC-USD', 'USD-BTC'], signal }),
  });

  return { dehydratedState: dehydrate(queryClient) };
};

export default function ReceiveLayout() {
  return (
    <ReceiveProvider initialAccount={defaultAccount}>
      <Outlet />
    </ReceiveProvider>
  );
}

import { Outlet, useOutletContext } from '@remix-run/react';
import type { ExchangeRates } from '~/lib/exchange-rate';

export default function ReceiveLayout() {
  const context = useOutletContext<{ rates: ExchangeRates }>();

  return <Outlet context={context} />;
}

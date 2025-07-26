/**
 * This route implements the lnurlp callback endpoint
 * defined by LUD 06: https://github.com/lnurl/luds/blob/luds/06.md
 * and LUD 21: https://have-you-heard.net/luds/LUD-21
 */

import { agicashDbServiceRole } from '~/features/agicash-db/database.server';
import { LightningAddressService } from '~/features/receive/lightning-address-service';
import type { Currency } from '~/lib/money';
import { Money } from '~/lib/money';
import type { Route } from './+types/api.lnurlp.callback.$userId';

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = params.userId;
  const url = new URL(request.url);

  const amountParam = url.searchParams.get('amount');
  const currency = url.searchParams.get('currency') as Currency | null;

  if (!amountParam || Number.isNaN(Number(amountParam))) {
    return new Response(
      JSON.stringify({ status: 'ERROR', reason: 'Invalid amount' }),
    );
  }

  const lightningAddressService = new LightningAddressService(
    request,
    agicashDbServiceRole,
  );

  const requestSupportsLUD21 = currency !== null;

  let amount: Money<Currency>;

  if (requestSupportsLUD21) {
    // LUD-21 flow: amount is in the specified currency
    if (!lightningAddressService.isSupportedCurrency(currency)) {
      return new Response(
        JSON.stringify({ status: 'ERROR', reason: 'Unsupported currency' }),
      );
    }

    amount = new Money({
      amount: amountParam,
      currency: currency,
      unit: currency === 'USD' ? 'cent' : 'msat',
    }) as Money<Currency>;
  } else {
    // Legacy flow: amount is always in millisatoshis
    amount = new Money({
      amount: amountParam,
      currency: 'BTC',
      unit: 'msat',
    }) as Money<Currency>;
  }

  const response = await lightningAddressService.handleLnurlpCallback({
    userId,
    amount,
    requestSupportsLUD21,
  });

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}

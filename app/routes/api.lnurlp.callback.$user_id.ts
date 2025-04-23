/**
 * This route implements the lnurlp callback endpoint
 * defined by LUD 06: https://github.com/lnurl/luds/blob/luds/06.md
 */

import { boardwalkDbServiceRole } from '~/features/boardwalk-db/database.server';
import { LightningAddressService } from '~/features/receive/lightning-address-service';
import { Money } from '~/lib/money';
import type { Route } from './+types/api.lnurlp.callback.$user_id';

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = params.user_id;

  const amountMsat = new URL(request.url).searchParams.get('amount');

  if (!amountMsat || Number.isNaN(Number(amountMsat))) {
    return new Response(
      JSON.stringify({ status: 'ERROR', reason: 'Invalid amount' }),
    );
  }

  const amount = new Money({
    amount: amountMsat,
    currency: 'BTC',
    unit: 'msat',
  });

  const lightningAddressService = new LightningAddressService(
    request,
    boardwalkDbServiceRole,
  );

  const response = await lightningAddressService.handleLnurlpCallback(
    userId,
    amount,
  );

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}

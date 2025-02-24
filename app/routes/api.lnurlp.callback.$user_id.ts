/**
 * This route implements the lnurlp callback endpoint
 * defined by LUD 06: https://github.com/lnurl/luds/blob/luds/06.md
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { boardwalkDbServiceRole } from '~/features/boardwalk-db/database.server';
import { LightningAddressService } from '~/features/receive/lightning-address-service';
import { Money } from '~/lib/money';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = params.user_id;
  if (!userId) {
    return new Response(
      JSON.stringify({ status: 'ERROR', reason: 'Invalid user id' }),
    );
  }

  const url = new URL(request.url);

  const amountMsat = url.searchParams.get('amount');
  if (!amountMsat) {
    return new Response(
      JSON.stringify({ status: 'ERROR', reason: 'Amount is required' }),
    );
  }
  if (Number.isNaN(Number(amountMsat))) {
    return new Response(
      JSON.stringify({ status: 'ERROR', reason: 'Invalid amount' }),
    );
  }
  const amount = new Money({
    amount: amountMsat,
    currency: 'BTC',
    unit: 'msat',
  });

  const service = new LightningAddressService(request, boardwalkDbServiceRole);
  const response = await service.processLNURLPCallback(userId, amount);

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}

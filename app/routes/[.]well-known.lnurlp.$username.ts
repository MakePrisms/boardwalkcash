/**
 * This route implements the `/.well-known/lnurlp/$username` endpoint
 * defined by LUD 16: https://github.com/lnurl/luds/blob/luds/16.md
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { boardwalkDbServiceRole } from '~/features/boardwalk-db/database.server';
import { LightningAddressService } from '~/features/receive/lightning-address-service';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const username = params.username;
  if (!username) {
    return new Response(
      JSON.stringify({ status: 'ERROR', reason: 'Username is required' }),
      { status: 400 },
    );
  }

  const service = new LightningAddressService(request, boardwalkDbServiceRole);
  const response = await service.processLNURLPRequest(username);

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

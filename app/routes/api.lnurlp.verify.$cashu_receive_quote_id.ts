/**
 * This route implements the LNURL-pay verify endpoint
 * defined by LUD21:  https://github.com/lnurl/luds/blob/luds/21.md
 */

import { boardwalkDbServiceRole } from '~/features/boardwalk-db/database.server';
import { LightningAddressService } from '~/features/receive/lightning-address-service';
import type { Route } from './+types/api.lnurlp.verify.$cashu_receive_quote_id';

export async function loader({ request, params }: Route.LoaderArgs) {
  const cashuReceiveQuoteId = params.cashu_receive_quote_id;

  const lightningAddressService = new LightningAddressService(
    request,
    boardwalkDbServiceRole,
  );

  const response =
    await lightningAddressService.handleLnurlpVerify(cashuReceiveQuoteId);

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

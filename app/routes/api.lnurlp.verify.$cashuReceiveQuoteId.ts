/**
 * This route implements the LNURL-pay verify endpoint
 * defined by LUD21:  https://github.com/lnurl/luds/blob/luds/21.md
 */

import { agicashDbServiceRole } from '~/features/agicash-db/database.server';
import { LightningAddressService } from '~/features/receive/lightning-address-service';
import type { Route } from './+types/api.lnurlp.verify.$cashuReceiveQuoteId';

export async function loader({ request, params }: Route.LoaderArgs) {
  const cashuReceiveQuoteId = params.cashuReceiveQuoteId;

  const lightningAddressService = new LightningAddressService(
    request,
    agicashDbServiceRole,
  );

  const response =
    await lightningAddressService.handleLnurlpVerify(cashuReceiveQuoteId);

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

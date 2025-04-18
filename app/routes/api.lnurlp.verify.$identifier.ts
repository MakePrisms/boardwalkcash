import { boardwalkDbServiceRole } from '~/features/boardwalk-db/database.server';
import { LightningAddressService } from '~/features/receive/lightning-address-service';
import type { Route } from './+types/api.lnurlp.verify.$identifier';

// QUESTION: how to do this for other account types? Identifier could be a quote id or
// for spark it could be a payment hash.
export async function loader({ request, params }: Route.LoaderArgs) {
  const identifier = params.identifier;

  const lightningAddressService = new LightningAddressService(
    request,
    boardwalkDbServiceRole,
  );
  const response = await lightningAddressService.handleLnurlpVerify(identifier);

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

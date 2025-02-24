import ky from 'ky';
import type {
  LNURLError,
  LNURLPayParams,
  LNURLPayResult,
  LNURLVerifyResult,
} from './types';

export const isLNURLError = (obj: object): obj is LNURLError => {
  return 'status' in obj && obj.status === 'ERROR';
};

/**
 * Fetch an invoice from a lightning address
 * @param lightningAddress - Lightning address to get the invoice from
 * @param amountMsat - Amount in msat to request
 * @see[LUD 16](https://github.com/lnurl/luds/blob/luds/16.md)
 * @example
 * ```ts
 * // request 10 sats from alice@example.com
 * const {pr: invoice} = await getInvoiceFromLightningAddress('alice@example.com', 10_000);
 * ```
 */
export const getInvoiceFromLightningAddress = async (
  lightningAddress: string,
  amountMsat: number,
): Promise<LNURLPayResult | LNURLError> => {
  const [user, host] = lightningAddress.split('@');
  if (!user || !host) {
    return { status: 'ERROR', reason: 'Invalid lightning address' };
  }

  try {
    const params = await ky
      .get(`https://${host}/.well-known/lnurlp/${user}`)
      .json<LNURLPayParams | LNURLError>();

    if (isLNURLError(params)) return params;

    const { callback, minSendable, maxSendable } = params;

    if (amountMsat < minSendable || amountMsat > maxSendable) {
      return {
        status: 'ERROR',
        reason: `Amount must be between ${minSendable} and ${maxSendable} msat`,
      };
    }

    const callbackRes = await ky
      .get(`${callback}?amount=${amountMsat}`)
      .json<LNURLPayResult | LNURLError>();

    if (isLNURLError(callbackRes)) return callbackRes;

    return {
      pr: callbackRes.pr,
      verify: callbackRes.verify,
      routes: callbackRes.routes ?? [],
    };
  } catch (error) {
    console.error('Failed to get invoice:', error);
    const msg =
      error instanceof Error ? error.message : 'Failed to get invoice';
    return { status: 'ERROR', reason: msg };
  }
};

/**
 * Check the status of an invoice that was returned by the lnurlp callback
 * @param verifyUrl - URL returned by the lnurlp callback
 * @see[LUD 21](https://github.com/lnurl/luds/blob/luds/21.md)
 * @example
 * ```ts
 * const { verify } = await getInvoiceFromLightningAddress('alice@example.com', 10_000);
 * // check the status of the invoice
 * const { settled } = await verifyInvoice(verify);
 * ```
 */
export const verifyInvoice = async (
  verifyUrl: string,
): Promise<LNURLVerifyResult | LNURLError> => {
  try {
    const result = await ky
      .get(verifyUrl)
      .json<LNURLVerifyResult | LNURLError>();
    return isLNURLError(result) ? result : result;
  } catch (error) {
    console.error('Failed to check invoice status:', error);
    return { status: 'ERROR', reason: 'Failed to check invoice status' };
  }
};

export type { LNURLPayResult, LNURLError };

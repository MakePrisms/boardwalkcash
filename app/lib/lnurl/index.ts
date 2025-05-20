import ky from 'ky';
import type { Money } from '../money';
import { buildEmailValidator } from '../validation';
import type { LNURLError, LNURLPayParams, LNURLPayResult } from './types';

export const isLNURLError = (obj: unknown): obj is LNURLError => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'status' in obj &&
    obj.status === 'ERROR'
  );
};

export const getLNURLPayParams = async (
  lightningAddress: string,
): Promise<LNURLPayParams | LNURLError> => {
  const [username, domain] = lightningAddress.split('@');
  if (!username || !domain) {
    return { status: 'ERROR', reason: 'Invalid lightning address' };
  }
  const protocol =
    domain.startsWith('localhost') || domain.startsWith('127.0.0.1')
      ? 'http'
      : 'https';
  return ky
    .get(`${protocol}://${domain}/.well-known/lnurlp/${username}`)
    .json();
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
export const getInvoiceFromLud16 = async (
  lud16: string,
  amount: Money<'BTC'>,
): Promise<LNURLPayResult | LNURLError> => {
  const amountMsat = amount.toNumber('msat');

  try {
    const params = await getLNURLPayParams(lud16);

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

export const isValidLightningAddress = async (address: string) => {
  try {
    const params = await getLNURLPayParams(address);
    return !isLNURLError(params);
  } catch {
    return false;
  }
};

export const buildLightningAddressFormatValidator = ({
  message,
  allowLocalhost = false,
}: {
  message: string;
  allowLocalhost?: boolean;
}) => {
  const validateLightningAddressFormat = buildEmailValidator(message);
  return (value: string | null | undefined): string | boolean => {
    if (value && allowLocalhost) {
      const localhostRegex = /^[a-zA-Z0-9._%+-]+@localhost(:\d+)?$/;
      if (localhostRegex.test(value)) {
        return true;
      }
    }

    return validateLightningAddressFormat(value);
  };
};

export const buildLightningAddressValidator = (props: {
  message: string;
  allowLocalhost?: boolean;
}) => {
  const validateLightningAddressFormat =
    buildLightningAddressFormatValidator(props);

  return async (
    value: string | null | undefined,
  ): Promise<string | boolean> => {
    const isValidFormat = validateLightningAddressFormat(value);

    if (isValidFormat !== true || !value) {
      return isValidFormat;
    }

    const isAddressValid = await isValidLightningAddress(value);

    return !isAddressValid ? props.message : true;
  };
};

export type { LNURLPayResult, LNURLError };

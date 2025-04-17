import { decodePaymentRequest } from '@cashu/cashu-ts';

/**
 * Checks if a string is a valid Cashu payment request
 * @param paymentRequest payment request to check
 */
export const isCashuPaymentRequest = (paymentRequest: string) => {
  try {
    decodePaymentRequest(paymentRequest);
    return true;
  } catch {
    return false;
  }
};

import type { CashuWallet, Proof } from '@cashu/cashu-ts';
import { getEncodedToken } from '@cashu/cashu-ts';
import type { SendOptions } from './types';

export const convertProofsToSendableToken = async (
  wallet: CashuWallet,
  proofs: Proof[],
  tokenAmount: number,
  memo?: string,
  options?: SendOptions,
) => {
  // will throw if proofs amount less than tokenAmount
  const { send, keep } = await wallet.send(tokenAmount, proofs, options);

  return {
    token: getEncodedToken({
      mint: wallet.mint.mintUrl,
      unit: wallet.unit,
      proofs: send,
      memo,
    }),
    change: keep,
  };
};

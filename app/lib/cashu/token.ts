import {
  CashuMint,
  CashuWallet,
  CheckStateEnum,
  type Proof,
  type Token,
} from '@cashu/cashu-ts';
import { proofToY } from './proof';

/**
 * A token consists of a set of proofs, and each proof can be in one of three states:
 * spent, pending, or unspent. When claiming a token, all that we care about is the unspent proofs.
 * The rest of the proofs will not be claimable.
 *
 * This function returns the set of proofs that are unspent
 * @param token - The token to get the unspent proofs from
 * @returns The set of unspent proofs
 */
export const getUnspentProofsFromToken = async (
  token: Token,
): Promise<Proof[]> => {
  const wallet = new CashuWallet(new CashuMint(token.mint), {
    unit: token.unit,
  });
  const states = await wallet.checkProofsStates(token.proofs);

  return token.proofs.filter((proof) => {
    const Y = proofToY(proof);
    const state = states.find((s) => s.Y === Y);
    return state?.state === CheckStateEnum.UNSPENT;
  });
};

import {
  CashuMint,
  CashuWallet,
  CheckStateEnum,
  type Token,
} from '@cashu/cashu-ts';

export const checkTokenForSpentProofs = async (token: Token) => {
  const wallet = new CashuWallet(new CashuMint(token.mint), {
    unit: token.unit,
  });
  const states = await wallet.checkProofsStates(token.proofs);

  const spent = states.filter((s) => s.state === CheckStateEnum.SPENT);
  const _pending = states.filter((s) => s.state === CheckStateEnum.PENDING);
  const _unspent = states.filter((s) => s.state === CheckStateEnum.UNSPENT);

  // TODO: should have some way to seperate proofs by state so that
  // if a token is partially spent, we can still use it
  // for now we just return true if any proofs are spent

  if (spent.length > 0) return true;

  return false;
};

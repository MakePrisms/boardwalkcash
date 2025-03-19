import type { Proof, Token } from '@cashu/cashu-ts';

/** Generate fake proofs */
export const createMockProofs = (amount: number): Proof[] => {
  const proofs: Proof[] = [];
  let remaining = amount;

  // Find largest power of 2 that fits
  while (remaining > 0) {
    const power = Math.floor(Math.log2(remaining));
    const proofAmount = 2 ** power;

    proofs.push({
      id: '009a1f293253e41e',
      amount: proofAmount,
      secret:
        '407915bc212be61a77e3e6d2aeb4c727980bda51cd06a6afc29e2861768a7837',
      C: '02bc9097997d81afb2cc7346b5e4345a9346bd2a506eb7958598a72f0cf85163ea',
    });

    remaining -= proofAmount;
  }

  return proofs;
};

export const createMockToken = (amount: number): Token => {
  return {
    mint: 'https://mint.example.com',
    proofs: createMockProofs(amount),
    unit: 'sat',
    memo: 'This is a memo',
  };
};

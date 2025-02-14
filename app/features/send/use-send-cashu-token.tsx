import type { Proof, Token } from '@cashu/cashu-ts';
import type { Account } from '~/features/accounts/account';
import { getDefaultUnit } from '~/features/shared/currencies';
import type { Money } from '~/lib/money';

const createMockProofs = (amount: number): Proof[] => {
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

export const useSendCashuToken = () => {
  const createSendableProofs = (
    amount: Money,
    _account: Account & { type: 'cashu' },
  ) => {
    return createMockProofs(amount.toNumber(getDefaultUnit(amount.currency)));
  };

  const createSendableToken = async (
    amount: Money,
    account: Account & { type: 'cashu' },
  ): Promise<Token> => {
    // TODO: check account's balance
    const proofs = createSendableProofs(amount, account);

    const tokenObject: Token = {
      mint: account.mintUrl,
      proofs,
      memo: 'memo',
      unit: getDefaultUnit(account.currency),
    };

    return tokenObject;
  };

  return { createSendableToken, createSendableProofs };
};

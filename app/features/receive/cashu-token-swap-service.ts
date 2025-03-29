import {
  type CashuWallet,
  MintOperationError,
  OutputData,
  type Token,
  getEncodedToken,
} from '@cashu/cashu-ts';
import { getCashuUnit, getCashuWallet, sumProofs } from '~/lib/cashu';
import { computeSHA256 } from '~/lib/sha256';
import type { CashuAccount } from '../accounts/account';
import {
  type CashuCryptography,
  tokenToMoney,
  useCashuCryptography,
} from '../shared/cashu';
import type { CashuTokenSwap } from './cashu-token-swap';
import {
  type CashuTokenSwapRepository,
  useCashuTokenSwapRepository,
} from './cashu-token-swap-repository';

export class CashuTokenSwapService {
  constructor(
    private readonly cryptography: CashuCryptography,
    private readonly tokenSwapRepository: CashuTokenSwapRepository,
  ) {}

  async prepareSwap({
    userId,
    token,
    account,
  }: { userId: string; token: Token; account: CashuAccount }) {
    const tokenHash = await computeSHA256(getEncodedToken(token));
    const amount = tokenToMoney(token);
    const cashuUnit = getCashuUnit(amount.currency);

    if (account.type !== 'cashu') {
      throw new Error('Not implemented');
    }

    if (account.mintUrl !== token.mint) {
      throw new Error('Cannot swap a token to a different mint');
    }

    const seed = await this.cryptography.getSeed();

    const wallet = getCashuWallet(account.mintUrl, {
      unit: cashuUnit,
      bip39seed: seed,
    });

    const keys = await wallet.getKeys();
    const counter = account.keysetCounters[wallet.keysetId] ?? 0;
    const outputData = OutputData.createDeterministicData(
      sumProofs(token.proofs),
      seed,
      counter,
      keys,
    );
    const outputAmounts = outputData.map((o) => o.blindedMessage.amount);

    const tokenSwap = await this.tokenSwapRepository.create({
      tokenHash,
      userId,
      accountId: account.id,
      amount,
      proofs: token.proofs,
      keysetId: wallet.keysetId,
      keysetCounter: counter,
      outputAmounts,
      accountVersion: account.version,
    });

    return tokenSwap;
  }

  async finalizeSwap(account: CashuAccount, tokenSwap: CashuTokenSwap) {
    const cashuUnit = getCashuUnit(tokenSwap.amount.currency);
    const seed = await this.cryptography.getSeed();

    // QUESTION: I wonder if we can avoid creating a new wallet here if already created
    // in prepareSwap. The thing is that this function is used for recovery
    // and on the first attempt

    const wallet = getCashuWallet(account.mintUrl, {
      unit: cashuUnit,
      bip39seed: seed,
    });

    const { tokenProofs, keysetId, keysetCounter } = tokenSwap;

    const outputData = OutputData.createDeterministicData(
      sumProofs(tokenProofs),
      seed,
      keysetCounter,
      await wallet.getKeys(keysetId),
      tokenSwap.outputAmounts,
    );

    const newProofs = await this.swapProofs(wallet, tokenSwap, outputData);
    const allProofs = [...account.proofs, ...newProofs];

    await this.tokenSwapRepository.completeTokenSwap({
      tokenHash: tokenSwap.tokenHash,
      proofs: allProofs,
      accountVersion: account.version,
    });

    return {
      updatedAccount: {
        ...account,
        proofs: allProofs,
        version: account.version + 1,
      },
    };
  }

  private async swapProofs(
    wallet: CashuWallet,
    tokenSwap: CashuTokenSwap,
    outputData: OutputData[],
  ) {
    try {
      const { send: newProofs } = await wallet.swap(
        sumProofs(tokenSwap.tokenProofs),
        tokenSwap.tokenProofs,
        {
          outputData: { send: outputData },
        },
      );
      return newProofs;
    } catch (error) {
      if (
        error instanceof MintOperationError &&
        error.message.toLowerCase().includes('outputs')
      ) {
        try {
          const { proofs } = await wallet.restore(
            tokenSwap.keysetCounter,
            tokenSwap.outputAmounts.length,
            {
              keysetId: tokenSwap.keysetId,
            },
          );
          // TODO: make sure these proofs are not already in our balance and that they are not spent
          console.log('Restored proofs', proofs);
          return proofs;
        } catch (error) {
          console.error(error);
          throw error;
        }
      }
      throw error;
    }
  }
}

export function useCashuTokenSwapService() {
  const cryptography = useCashuCryptography();
  const tokenSwapRepository = useCashuTokenSwapRepository();
  return new CashuTokenSwapService(cryptography, tokenSwapRepository);
}

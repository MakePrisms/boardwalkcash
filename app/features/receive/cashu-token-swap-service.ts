import {
  type CashuWallet,
  MintOperationError,
  OutputData,
  type Token,
} from '@cashu/cashu-ts';
import { getCashuUnitFromToken, getCashuWallet, sumProofs } from '~/lib/cashu';
import type { CashuAccount } from '../accounts/account';
import { type CashuCryptography, useCashuCryptography } from '../shared/cashu';
import {
  type CashuTokenSwap,
  FailedToCompleteTokenSwapError,
} from './cashu-token-swap';
import {
  type CashuTokenSwapRepository,
  useCashuTokenSwapRepository,
} from './cashu-token-swap-repository';

export class CashuTokenSwapService {
  constructor(
    private readonly cryptography: CashuCryptography,
    private readonly tokenSwapRepository: CashuTokenSwapRepository,
  ) {}

  async swapToClaim({
    userId,
    token,
    account,
  }: {
    userId: string;
    token: Token;
    account: CashuAccount;
  }): Promise<CashuTokenSwap> {
    const cashuUnit = getCashuUnitFromToken(token);

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

    // TODO: handle where the tokenSwap is already completed
    const tokenSwap = await this.tokenSwapRepository.getOrCreate({
      token,
      userId,
      accountId: account.id,
      keysetId: wallet.keysetId,
      keysetCounter: counter,
      outputAmounts,
      accountVersion: account.version,
    });

    const newProofs = await this.swapProofs(wallet, tokenSwap, outputData);
    const allProofs = [...account.proofs, ...newProofs];

    try {
      // QUESTION: de we need optimist updates on token swaps?
      // I don't think so because we only update the state from pending to completed
      await this.tokenSwapRepository.completeTokenSwap({
        tokenHash: tokenSwap.tokenHash,
        proofs: allProofs,
        accountVersion: account.version,
      });

      return tokenSwap;
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to complete token swap';
      throw new FailedToCompleteTokenSwapError(msg, tokenSwap);
    }
  }

  private async swapProofs(
    wallet: CashuWallet,
    tokenSwap: CashuTokenSwap,
    outputData: OutputData[],
  ) {
    const proofs = tokenSwap.tokenProofs;
    try {
      const { send: newProofs } = await wallet.swap(sumProofs(proofs), proofs, {
        outputData: { send: outputData },
      });
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

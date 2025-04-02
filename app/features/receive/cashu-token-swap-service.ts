import {
  type CashuWallet,
  MintOperationError,
  OutputData,
  type Token,
} from '@cashu/cashu-ts';
import {
  CashuErrorCodes,
  getCashuUnit,
  getCashuWallet,
  sumProofs,
} from '~/lib/cashu';
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

  async create({
    userId,
    token,
    account,
  }: { userId: string; token: Token; account: CashuAccount }) {
    if (account.mintUrl !== token.mint) {
      throw new Error('Cannot swap a token to a different mint');
    }

    const amount = tokenToMoney(token);
    const cashuUnit = getCashuUnit(amount.currency);
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

    const tokenSwap = await this.tokenSwapRepository.getOrCreate({
      token,
      userId,
      accountId: account.id,
      keysetId: wallet.keysetId,
      keysetCounter: counter,
      outputAmounts,
      accountVersion: account.version,
    });

    // QUESTION: should we check if the tokenSwap is already completed?
    // I keep resetting the database and thus reusing the same counters.
    // This means I'm never actually spending the token's proofs, I'm just restoring
    // old proofs so then the tokenSwap is always completed, but this is only
    // a dev problem. But should we throw an error if the tokenSwap is already completed?

    return tokenSwap;
  }

  async completeSwap(account: CashuAccount, tokenSwap: CashuTokenSwap) {
    if (tokenSwap.state !== 'PENDING') {
      throw new Error('Token swap is not pending');
    }

    const cashuUnit = getCashuUnit(tokenSwap.amount.currency);
    const seed = await this.cryptography.getSeed();

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
        ([
          CashuErrorCodes.OUTPUT_ALREADY_SIGNED,
          CashuErrorCodes.TOKEN_ALREADY_SPENT,
        ].includes(error.code) ||
          // Nutshell mint implementation did not conform to the spec up until version 0.16.5 (see https://github.com/cashubtc/nutshell/pull/693)
          // so for earlier versions we need to check the message.
          error.message
            .toLowerCase()
            .includes('outputs have already been signed before') ||
          error.message.toLowerCase().includes('mint quote already issued.'))
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

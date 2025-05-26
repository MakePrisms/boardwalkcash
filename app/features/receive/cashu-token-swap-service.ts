import {
  type CashuWallet,
  MintOperationError,
  OutputData,
  type Token,
} from '@cashu/cashu-ts';
import {
  CashuErrorCodes,
  amountsFromOutputData,
  getCashuUnit,
  getCashuWallet,
  sumProofs,
} from '~/lib/cashu';
import { sum } from '~/lib/utils';
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
    reversedTxid,
  }: {
    userId: string;
    token: Token;
    account: CashuAccount;
    reversedTxid?: string;
  }) {
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
    const fee = wallet.getFeesForProofs(token.proofs);
    const amountToReceive = sumProofs(token.proofs) - fee;

    if (amountToReceive <= 0) {
      throw new Error('Token is too small to claim.');
    }

    const outputData = OutputData.createDeterministicData(
      amountToReceive,
      seed,
      counter,
      keys,
    );
    const outputAmounts = amountsFromOutputData(outputData);

    const tokenSwap = await this.tokenSwapRepository.create(
      {
        token,
        userId,
        accountId: account.id,
        keysetId: wallet.keysetId,
        keysetCounter: counter,
        outputAmounts,
        fee,
        accountVersion: account.version,
      },
      { reversedTxid },
    );

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

    const { keysetId, keysetCounter } = tokenSwap;
    const amountToReceive = sum(tokenSwap.outputAmounts);

    const outputData = OutputData.createDeterministicData(
      amountToReceive,
      seed,
      keysetCounter,
      await wallet.getKeys(keysetId),
      tokenSwap.outputAmounts,
    );

    try {
      const newProofs = await this.swapProofs(wallet, tokenSwap, outputData);
      const allProofs = [...account.proofs, ...newProofs];

      await this.tokenSwapRepository.completeTokenSwap({
        tokenHash: tokenSwap.tokenHash,
        userId: tokenSwap.userId,
        swapVersion: tokenSwap.version,
        proofs: allProofs,
        accountVersion: account.version,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'TOKEN_ALREADY_CLAIMED') {
        await this.tokenSwapRepository.fail({
          tokenHash: tokenSwap.tokenHash,
          userId: tokenSwap.userId,
          version: tokenSwap.version,
          reason: 'Token already claimed',
        });
      } else {
        throw error;
      }
    }
  }

  private async swapProofs(
    wallet: CashuWallet,
    tokenSwap: CashuTokenSwap,
    outputData: OutputData[],
  ) {
    try {
      const amountToReceive = sum(tokenSwap.outputAmounts);
      const { send: newProofs } = await wallet.swap(
        amountToReceive,
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
            .includes('outputs have already been signed before'))
      ) {
        const { proofs } = await wallet.restore(
          tokenSwap.keysetCounter,
          tokenSwap.outputAmounts.length,
          {
            keysetId: tokenSwap.keysetId,
          },
        );

        if (
          error.code === CashuErrorCodes.TOKEN_ALREADY_SPENT &&
          proofs.length === 0
        ) {
          // If token is spent and we could not restore proofs, then we know someone else has claimed this token.
          throw new Error('TOKEN_ALREADY_CLAIMED');
        }

        // TODO: make sure these proofs are not already in our balance and that they are not spent
        return proofs;
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

import {
  type CashuWallet,
  MintOperationError,
  OutputData,
  type Proof,
} from '@cashu/cashu-ts';
import type { CashuAccount } from '~/features/accounts/account';
import {
  CashuErrorCodes,
  amountsFromOutputData,
  getCashuUnit,
  getCashuWallet,
  sumProofs,
} from '~/lib/cashu';
import { Money } from '~/lib/money';
import { uint8ArrayToHex } from '~/lib/utils';
import { type CashuCryptography, useCashuCryptography } from '../shared/cashu';
import type { CashuSendSwap } from './cashu-send-swap';
import {
  type CashuSendSwapRepository,
  useCashuSendSwapRepository,
} from './cashu-send-swap-repository';

export class CashuSendSwapService {
  constructor(
    private readonly cashuSendSwapRepository: CashuSendSwapRepository,
    private readonly cryptography: CashuCryptography,
  ) {}

  /**
   * Estimates the cashu swap fee that would be required to send the amount based on the account's proofs.
   * @throws Error if the account does not have enough balance
   */
  async estimateFee({
    account,
    amount,
    senderPaysFee,
  }: {
    /** The account to send from. */
    account: CashuAccount;
    /** The amount to send in the account's currency */
    amount: Money;
    /** Whether the sender pays the fee for the swap by including the fee in the proofs to send */
    senderPaysFee: boolean;
  }) {
    if (account.currency !== amount.currency) {
      throw new Error(
        'Currency mismatch. Account currency to send from must match the amount to send currency.',
      );
    }

    const cashuUnit = getCashuUnit(account.currency);
    const amountNumber = amount.toNumber(cashuUnit);
    const wallet = getCashuWallet(account.mintUrl, { unit: cashuUnit });

    const { fee } = await this.prepareProofsAndFee(
      wallet,
      account.proofs,
      amountNumber,
      senderPaysFee,
    );

    return new Money({
      amount: fee,
      currency: amount.currency,
      unit: cashuUnit,
    });
  }

  /**
   * @throws Error if the account does not have enough balance
   */
  async create({
    userId,
    account,
    amount,
    senderPaysFee,
  }: {
    /** The id of the user creating the swap */
    userId: string;
    /** The account to send from.  */
    account: CashuAccount;
    /** The amount to send in the account's currency */
    amount: Money;
    /** Whether the sender pays the fee for the swap by including the fee in the proofs to send */
    senderPaysFee: boolean;
  }) {
    if (account.currency !== amount.currency) {
      throw new Error(
        'Currency mismatch. Account currency to send from must match the amount to send currency.',
      );
    }

    const cashuUnit = getCashuUnit(account.currency);
    const amountNumber = amount.toNumber(cashuUnit);

    const seed = await this.cryptography.getSeed();
    const wallet = getCashuWallet(account.mintUrl, {
      unit: cashuUnit,
      bip39seed: seed,
    });

    const {
      keep: accountProofsToKeep,
      send,
      fee,
    } = await this.prepareProofsAndFee(
      wallet,
      account.proofs,
      amountNumber,
      senderPaysFee,
    );

    const totalAmountToSend = amountNumber + fee;

    let proofsToSend: Proof[] | undefined;
    if (sumProofs(send) === totalAmountToSend) {
      proofsToSend = send;
    }

    // TODO: if we have proofsToSend, then no need to make output data

    const keys = await wallet.getKeys();
    const sendKeysetCounter = account.keysetCounters[wallet.keysetId] ?? 0;
    const sendOutputData = OutputData.createDeterministicData(
      totalAmountToSend,
      seed,
      sendKeysetCounter,
      keys,
    );

    // TODO: is this right? There is a swap fee we include for the receiver, but also we might need to swap
    // to get proofsToSend. which will incur another fee.
    const feeToSwap = proofsToSend ? 0 : fee;

    const amountToKeep = sumProofs(send) - totalAmountToSend - feeToSwap;
    const keepKeysetCounter = sendKeysetCounter + sendOutputData.length;
    const keepOutputData = OutputData.createDeterministicData(
      amountToKeep,
      seed,
      keepKeysetCounter,
      keys,
    );

    // QUESTION: we only need the updated swap right now, should we still return the
    // updated account from the db function? Same QUESTION for completeSwap
    const { updatedSwap } = await this.cashuSendSwapRepository.create({
      accountId: account.id,
      accountVersion: account.version,
      userId,
      inputProofs: send,
      proofsToSend,
      accountProofs: accountProofsToKeep,
      amountRequested: amount,
      amountToSend: new Money({
        amount: totalAmountToSend,
        currency: amount.currency,
        unit: cashuUnit,
      }),
      fee: new Money({
        amount: fee,
        currency: amount.currency,
        unit: cashuUnit,
      }),
      keysetId: wallet.keysetId,
      keysetCounter: sendKeysetCounter,
      mintUrl: account.mintUrl,
      outputData: {
        send: sendOutputData,
        keep: keepOutputData,
      },
    });

    return updatedSwap;
  }

  async completeSwap({
    account,
    swap,
  }: { account: CashuAccount; swap: CashuSendSwap }) {
    if (swap.state !== 'SWAPPING') {
      throw new Error('Swap is not SWAPPING');
    }
    if (swap.accountId !== account.id) {
      throw new Error('Swap does not belong to account');
    }

    const seed = await this.cryptography.getSeed();
    const wallet = getCashuWallet(swap.mintUrl, {
      unit: getCashuUnit(swap.amountToSend.currency),
      bip39seed: seed,
    });

    const { send: proofsToSend, keep: newProofsToKeep } = await this.swapProofs(
      wallet,
      swap,
    );

    const accountProofs = [...account.proofs, ...newProofsToKeep];

    // QUESTION: we only need the updated swap right now, should we still return
    // the updated account from the db function? Same QUESTION for create
    const { updatedSwap } = await this.cashuSendSwapRepository.completeSwap({
      swapId: swap.id,
      swapVersion: swap.version,
      accountVersion: account.version,
      proofsToSend,
      accountProofs,
    });

    return updatedSwap;
  }

  private async prepareProofsAndFee(
    wallet: CashuWallet,
    proofs: Proof[],
    amountNumber: number,
    includeFeesInSendAmount: boolean,
  ): Promise<{ keep: Proof[]; send: Proof[]; fee: number }> {
    // If we want to do fee calculation, then the keys are required
    includeFeesInSendAmount && (await wallet.getKeys());

    const { keep, send } = wallet.selectProofsToSend(
      proofs,
      amountNumber,
      includeFeesInSendAmount,
    );

    const fee = includeFeesInSendAmount ? wallet.getFeesForProofs(send) : 0;

    if (sumProofs(send) < amountNumber + fee) {
      throw new Error('Insufficient balance');
    }

    return { keep, send, fee };
  }

  private async swapProofs(wallet: CashuWallet, swap: CashuSendSwap) {
    const amountToSend = swap.amountToSend.toNumber(
      getCashuUnit(swap.currency),
    );
    try {
      return await wallet.swap(amountToSend, swap.inputProofs, {
        outputData: swap.outputData,
        keysetId: swap.keysetId,
      });
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
        const { send, keep } = swap.outputData;
        const totalOutputCount = amountsFromOutputData([
          ...send,
          ...keep,
        ]).length;
        const { proofs } = await wallet.restore(
          swap.keysetCounter,
          totalOutputCount,
          {
            keysetId: swap.keysetId,
          },
        );

        if (
          error.code === CashuErrorCodes.TOKEN_ALREADY_SPENT &&
          proofs.length === 0
        ) {
          throw new Error('TOKEN_ALREADY_CLAIMED');
        }

        return {
          send: proofs.filter((o) =>
            send.some((s) => uint8ArrayToHex(s.secret) === o.secret),
          ),
          keep: proofs.filter((o) =>
            keep.some((s) => uint8ArrayToHex(s.secret) === o.secret),
          ),
        };
      }

      throw error;
    }
  }
}

export function useCashuSendSwapService() {
  const cashuSendSwapRepository = useCashuSendSwapRepository();
  const cryptography = useCashuCryptography();
  return new CashuSendSwapService(cashuSendSwapRepository, cryptography);
}

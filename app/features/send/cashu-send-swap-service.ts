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

export type CashuSwapQuote = {
  amountRequested: Money;
  senderPaysFee: boolean;
  receiveSwapFee: number;
  sendSwapFee: number;
  totalFee: Money;
  amountToSend: Money;
};

export class CashuSendSwapService {
  constructor(
    private readonly cashuSendSwapRepository: CashuSendSwapRepository,
    private readonly cryptography: CashuCryptography,
  ) {}

  /**
   * Estimates the cashu swap fee that would be required to send the amount based on the account's proofs.
   * @throws Error if the account does not have enough balance
   */
  async getQuote({
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
  }): Promise<CashuSwapQuote> {
    if (account.currency !== amount.currency) {
      throw new Error(
        'Currency mismatch. Account currency to send from must match the amount to send currency.',
      );
    }

    const cashuUnit = getCashuUnit(account.currency);
    const amountNumber = amount.toNumber(cashuUnit);
    const wallet = getCashuWallet(account.mintUrl, { unit: cashuUnit });

    const { receiveSwapFee, sendSwapFee } = await this.prepareProofsAndFee(
      wallet,
      account.proofs,
      amountNumber,
      senderPaysFee,
    );

    return {
      amountRequested: amount,
      amountToSend: new Money({
        amount: amountNumber + receiveSwapFee,
        currency: amount.currency,
        unit: cashuUnit,
      }),
      totalFee: new Money({
        amount: receiveSwapFee + sendSwapFee,
        currency: amount.currency,
        unit: cashuUnit,
      }),
      senderPaysFee,
      receiveSwapFee,
      sendSwapFee,
    };
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
  }): Promise<CashuSendSwap> {
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
      receiveSwapFee,
      sendSwapFee,
    } = await this.prepareProofsAndFee(
      wallet,
      account.proofs,
      amountNumber,
      senderPaysFee,
    );

    const totalAmountToSend = amountNumber + receiveSwapFee;

    let proofsToSend: Proof[] | undefined;
    let sendOutputData: OutputData[] = [];
    let keepOutputData: OutputData[] = [];
    let sendKeysetCounter: number | undefined;
    let keysetId: string | undefined;

    const haveExactProofs = sumProofs(send) === totalAmountToSend;
    if (haveExactProofs) {
      proofsToSend = send;
    } else {
      const keys = await wallet.getKeys();
      keysetId = keys.id;
      sendKeysetCounter = account.keysetCounters[keysetId] ?? 0;
      sendOutputData = OutputData.createDeterministicData(
        totalAmountToSend,
        seed,
        sendKeysetCounter,
        keys,
      );

      const amountToKeep = sumProofs(send) - totalAmountToSend - sendSwapFee;
      const keepKeysetCounter = sendKeysetCounter + sendOutputData.length;
      keepOutputData = OutputData.createDeterministicData(
        amountToKeep,
        seed,
        keepKeysetCounter,
        keys,
      );
    }

    return this.cashuSendSwapRepository.create({
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
        amount: receiveSwapFee,
        currency: amount.currency,
        unit: cashuUnit,
      }),
      keysetId,
      keysetCounter: sendKeysetCounter,
      mintUrl: account.mintUrl,
      outputAmounts: {
        send: amountsFromOutputData(sendOutputData),
        keep: amountsFromOutputData(keepOutputData),
      },
    });
  }

  async swapForProofsToSend({
    account,
    swap,
  }: { account: CashuAccount; swap: CashuSendSwap }) {
    if (swap.state !== 'DRAFT') {
      throw new Error('Swap is not DRAFT');
    }
    if (swap.accountId !== account.id) {
      throw new Error('Swap does not belong to account');
    }

    const seed = await this.cryptography.getSeed();
    const wallet = getCashuWallet(swap.mintUrl, {
      unit: getCashuUnit(swap.amountToSend.currency),
      bip39seed: seed,
    });

    const keys = await wallet.getKeys(swap.keysetId);
    const sendAmount = swap.amountToSend.toNumber(getCashuUnit(swap.currency));
    const sendOutputData = OutputData.createDeterministicData(
      sendAmount,
      seed,
      swap.keysetCounter,
      keys,
      swap.outputAmounts.send,
    );

    const amountToKeep =
      sumProofs(swap.inputProofs) -
      sendAmount -
      swap.sendSwapFee.toNumber(getCashuUnit(swap.currency));
    const keepOutputData = OutputData.createDeterministicData(
      amountToKeep,
      seed,
      swap.keysetCounter + sendOutputData.length,
      keys,
      swap.outputAmounts.keep,
    );

    const { send: proofsToSend, keep: newProofsToKeep } = await this.swapProofs(
      wallet,
      swap,
      {
        keep: keepOutputData,
        send: sendOutputData,
      },
    );

    if (proofsToSend.length === 0) {
      console.error('No proofs to send', {
        swap,
        account,
      });
      throw new Error('No proofs to send');
    }

    const accountProofs = [...account.proofs, ...newProofsToKeep];

    await this.cashuSendSwapRepository.completeSwap({
      swap,
      accountVersion: account.version,
      proofsToSend,
      accountProofs,
    });
  }

  async complete(swap: CashuSendSwap) {
    return this.cashuSendSwapRepository.complete({
      swapId: swap.id,
      swapVersion: swap.version,
    });
  }

  async fail(swap: CashuSendSwap, reason: string) {
    return this.cashuSendSwapRepository.fail({
      swapId: swap.id,
      swapVersion: swap.version,
      reason,
    });
  }

  private async prepareProofsAndFee(
    wallet: CashuWallet,
    proofs: Proof[],
    amountNumber: number,
    includeFeesInSendAmount: boolean,
  ): Promise<{
    keep: Proof[];
    send: Proof[];
    sendSwapFee: number;
    receiveSwapFee: number;
  }> {
    // If we want to do fee calculation, then the keys are required
    includeFeesInSendAmount && (await wallet.getKeys());

    const { keep, send } = wallet.selectProofsToSend(
      proofs,
      amountNumber,
      includeFeesInSendAmount,
    );

    const fee = includeFeesInSendAmount ? wallet.getFeesForProofs(send) : 0;

    // TODO: make sure these fees will always be the same, I don't think will
    const sendSwapFee = fee;
    const receiveSwapFee = fee;

    if (sumProofs(send) < amountNumber + sendSwapFee + receiveSwapFee) {
      throw new Error('Insufficient balance');
    }

    return { keep, send, sendSwapFee, receiveSwapFee };
  }

  private async swapProofs(
    wallet: CashuWallet,
    swap: CashuSendSwap & { state: 'DRAFT' },
    outputData: {
      keep: OutputData[];
      send: OutputData[];
    },
  ) {
    const amountToSend = swap.amountToSend.toNumber(
      getCashuUnit(swap.currency),
    );

    try {
      return await wallet.swap(amountToSend, swap.inputProofs, {
        outputData,
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
        const totalOutputCount =
          outputData.send.length + outputData.keep.length;
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
            outputData.send.some((s) => uint8ArrayToHex(s.secret) === o.secret),
          ),
          keep: proofs.filter((o) =>
            outputData.keep.some((s) => uint8ArrayToHex(s.secret) === o.secret),
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

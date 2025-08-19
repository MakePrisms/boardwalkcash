import {
  type CashuWallet,
  MintOperationError,
  OutputData,
  type Proof,
} from '@cashu/cashu-ts';
import type { CashuAccount } from '~/features/accounts/account';
import {
  CashuErrorCodes,
  type ExtendedCashuWallet,
  amountsFromOutputData,
  getCashuProtocolUnit,
  getCashuUnit,
  getCashuWallet,
  sumProofs,
} from '~/lib/cashu';
import { Money } from '~/lib/money';
import {
  type CashuTokenSwapService,
  useCashuTokenSwapService,
} from '../receive/cashu-token-swap-service';
import {
  type CashuCryptography,
  getTokenHash,
  useCashuCryptography,
} from '../shared/cashu';
import { getDefaultUnit } from '../shared/currencies';
import { DomainError } from '../shared/error';
import type { CashuSendSwap } from './cashu-send-swap';
import {
  type CashuSendSwapRepository,
  useCashuSendSwapRepository,
} from './cashu-send-swap-repository';

export type CashuSwapQuote = {
  amountRequested: Money;
  senderPaysFee: boolean;
  cashuReceiveFee: Money;
  cashuSendFee: Money;
  totalAmount: Money;
  totalFee: Money;
  amountToSend: Money;
};

export class CashuSendSwapService {
  constructor(
    private readonly cashuSendSwapRepository: CashuSendSwapRepository,
    private readonly cryptography: CashuCryptography,
    private readonly cashuTokenSwapService: CashuTokenSwapService,
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

    const { cashuReceiveFee, cashuSendFee } = await this.prepareProofsAndFee(
      wallet,
      account.proofs,
      amount,
      senderPaysFee,
    );

    const toMoney = (num: number) =>
      new Money({
        amount: num,
        currency: amount.currency,
        unit: cashuUnit,
      });

    return {
      amountRequested: amount,
      amountToSend: toMoney(amountNumber + cashuReceiveFee),
      totalAmount: toMoney(amountNumber + cashuReceiveFee + cashuSendFee),
      totalFee: toMoney(cashuReceiveFee + cashuSendFee),
      senderPaysFee,
      cashuReceiveFee: toMoney(cashuReceiveFee),
      cashuSendFee: toMoney(cashuSendFee),
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
      cashuReceiveFee,
      cashuSendFee,
    } = await this.prepareProofsAndFee(
      wallet,
      account.proofs,
      amount,
      senderPaysFee,
    );

    const totalAmountToSend = amountNumber + cashuReceiveFee;

    let proofsToSend: Proof[] | undefined;
    let tokenHash: string | undefined;
    let sendOutputData: OutputData[] = [];
    let keepOutputData: OutputData[] = [];
    let sendKeysetCounter: number | undefined;
    let keysetId: string | undefined;

    const haveExactProofs = sumProofs(send) === totalAmountToSend;
    if (haveExactProofs) {
      proofsToSend = send;
      tokenHash = await getTokenHash({
        mint: account.mintUrl,
        proofs: proofsToSend,
        unit: getCashuProtocolUnit(amount.currency),
      });
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

      const amountToKeep = sumProofs(send) - totalAmountToSend - cashuSendFee;
      const keepKeysetCounter = sendKeysetCounter + sendOutputData.length;
      keepOutputData = OutputData.createDeterministicData(
        amountToKeep,
        seed,
        keepKeysetCounter,
        keys,
      );
    }

    const toMoney = (num: number) =>
      new Money({
        amount: num,
        currency: amount.currency,
        unit: cashuUnit,
      });

    return this.cashuSendSwapRepository.create({
      accountId: account.id,
      accountVersion: account.version,
      userId,
      inputProofs: send,
      proofsToSend,
      accountProofs: accountProofsToKeep,
      amountRequested: amount,
      amountToSend: toMoney(totalAmountToSend),
      cashuSendFee: toMoney(cashuSendFee),
      cashuReceiveFee: toMoney(cashuReceiveFee),
      totalAmount: toMoney(totalAmountToSend + cashuSendFee),
      keysetId,
      keysetCounter: sendKeysetCounter,
      tokenHash,
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
    const wallet = getCashuWallet(account.mintUrl, {
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
      swap.cashuSendFee.toNumber(getCashuUnit(swap.currency));
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
      // this can happen if the input proofs were already spent by another wallet
      return this.fail(swap, 'Could not restore proofs to send');
    }

    const tokenHash = await getTokenHash({
      mint: account.mintUrl,
      proofs: proofsToSend,
      unit: getCashuProtocolUnit(swap.amountToSend.currency),
    });

    const accountProofs = [...account.proofs, ...newProofsToKeep];

    await this.cashuSendSwapRepository.commitProofsToSend({
      swap,
      accountVersion: account.version,
      proofsToSend,
      accountProofs,
      tokenHash,
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

  async reverse(swap: CashuSendSwap, account: CashuAccount) {
    if (swap.state !== 'PENDING') {
      throw new Error('Swap is not PENDING');
    }
    if (swap.accountId !== account.id) {
      throw new Error('Swap does not belong to account');
    }

    return this.cashuTokenSwapService.create({
      account,
      userId: swap.userId,
      token: {
        mint: account.mintUrl,
        proofs: swap.proofsToSend,
        unit: getCashuProtocolUnit(swap.currency),
      },
      reversedTransactionId: swap.transactionId,
    });
  }

  private async prepareProofsAndFee(
    wallet: ExtendedCashuWallet,
    allProofs: Proof[],
    requestedAmount: Money,
    includeFeesInSendAmount: boolean,
  ): Promise<{
    keep: Proof[];
    send: Proof[];
    cashuSendFee: number;
    cashuReceiveFee: number;
  }> {
    if (includeFeesInSendAmount) {
      // If we want to do fee calculation, then the keys are required
      await wallet.getKeys();
    }

    const currency = requestedAmount.currency;
    const cashuUnit = getCashuUnit(currency);
    const requestedAmountNumber = requestedAmount.toNumber(cashuUnit);

    let { keep, send } = wallet.selectProofsToSend(
      allProofs,
      requestedAmountNumber,
      includeFeesInSendAmount,
    );
    const feeToSwapSelectedProofs = wallet.getFeesForProofs(send);

    if (!includeFeesInSendAmount) {
      throw new Error(
        'Sender must pay fees - this feature is not yet implemented',
      );
    }

    let proofAmountSelected = sumProofs(send);
    const amountToSend = requestedAmountNumber + feeToSwapSelectedProofs;

    console.debug('proofSelection', {
      selectedProofs: send.map((p) => p.amount),
      proofAmountSelected,
      amountToSend,
      feeToSwapSelectedProofs,
    });

    if (proofAmountSelected === amountToSend) {
      return {
        keep,
        send,
        cashuSendFee: 0,
        cashuReceiveFee: feeToSwapSelectedProofs,
      };
    }

    const estimatedFeeToReceive =
      wallet.getFeesEstimateToReceiveAtLeast(amountToSend);

    if (proofAmountSelected < amountToSend) {
      const totalAmount = new Money({
        amount: requestedAmountNumber + estimatedFeeToReceive,
        currency: currency,
        unit: cashuUnit,
      });
      const unit = getDefaultUnit(currency);

      throw new DomainError(
        `Insufficient balance. Total amount including fees is ${totalAmount.toLocaleString({ unit })}.`,
      );
    }

    ({ keep, send } = wallet.selectProofsToSend(
      allProofs,
      requestedAmountNumber + estimatedFeeToReceive,
      includeFeesInSendAmount,
    ));
    proofAmountSelected = sumProofs(send);

    const cashuSendFee = wallet.getFeesForProofs(send);
    const cashuReceiveFee = estimatedFeeToReceive;

    if (
      proofAmountSelected <
      requestedAmountNumber + cashuSendFee + cashuReceiveFee
    ) {
      const totalAmount = new Money({
        amount: requestedAmountNumber + cashuSendFee + cashuReceiveFee,
        currency: currency,
        unit: cashuUnit,
      });
      const unit = getDefaultUnit(currency);

      throw new DomainError(
        `Insufficient balance. Total amount including fees is ${totalAmount.toLocaleString({ unit })}.`,
      );
    }

    console.debug('fees', {
      cashuSendFee,
      cashuReceiveFee,
    });

    return { keep, send, cashuSendFee, cashuReceiveFee };
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

        const textDecoder = new TextDecoder();
        return {
          send: proofs.filter((o) =>
            outputData.send.some(
              (s) => textDecoder.decode(s.secret) === o.secret,
            ),
          ),
          keep: proofs.filter((o) =>
            outputData.keep.some(
              (s) => textDecoder.decode(s.secret) === o.secret,
            ),
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
  const cashuTokenSwapService = useCashuTokenSwapService();
  return new CashuSendSwapService(
    cashuSendSwapRepository,
    cryptography,
    cashuTokenSwapService,
  );
}

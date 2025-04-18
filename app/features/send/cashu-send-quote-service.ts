import {
  type MeltQuoteResponse,
  MeltQuoteState,
  OutputData,
} from '@cashu/cashu-ts';
import type { Big } from 'big.js';
import { validateBolt11Invoice } from '~/lib/bolt11';
import { getCashuUnit, getCashuWallet, sumProofs } from '~/lib/cashu';
import { type Currency, Money } from '~/lib/money';
import type { CashuAccount } from '../accounts/account';
import { type CashuCryptography, useCashuCryptography } from '../shared/cashu';
import type { CashuSendQuote } from './cashu-send-quote';
import {
  type CashuSendQuoteRepository,
  useCashuSendQuoteRepository,
} from './cashu-send-quote-repository';

type GetLightningQuoteOptions = {
  /**
   * The account to send the money from.
   */
  account: CashuAccount;
  /**
   * Bolt 11 lightning invoice to pay.
   */
  paymentRequest: string;
  /**
   * The amount to send. Needs to be provided in case of amountless lightning invoice.
   * If the invoice has an amount and this is provided, it will be ignored.
   */
  amount?: Money;
  /**
   * The exchange rate to be used to convert the amount to milli-satoshis.
   * Must be provided if amount is provided in any currency other than BTC. Otherwise the exception will be thrown.
   */
  exchangeRate?: Big;
};

export type SendQuoteRequest = {
  paymentRequest: string;
  amountRequested: Money;
  amountRequestedInBtc: Money<'BTC'>;
  meltQuote: MeltQuoteResponse;
};

export class CashuSendQuoteService {
  constructor(
    private readonly cryptography: CashuCryptography,
    private readonly cashuSendRepository: CashuSendQuoteRepository,
  ) {}

  async getLightningQuote({
    account,
    paymentRequest,
    amount,
    exchangeRate,
  }: GetLightningQuoteOptions) {
    const bolt11ValidationResult = validateBolt11Invoice(paymentRequest);
    if (!bolt11ValidationResult.valid) {
      throw new Error('Invalid lightning invoice');
    }
    const invoice = bolt11ValidationResult.decoded;

    if (invoice.expiryUnixMs && new Date(invoice.expiryUnixMs) < new Date()) {
      throw new Error('Lightning invoice has expired');
    }

    let amountRequestedInBtc = new Money({
      amount: 0,
      currency: 'BTC',
    });

    if (invoice.amountMsat) {
      amountRequestedInBtc = new Money({
        amount: invoice.amountMsat,
        currency: 'BTC',
        unit: 'msat',
      });
    } else if (amount) {
      if (amount.currency === 'BTC') {
        amountRequestedInBtc = amount as Money<'BTC'>;
      } else if (exchangeRate) {
        amountRequestedInBtc = amount.convert('BTC', exchangeRate);
      } else {
        throw new Error('Exchange rate is required for non-BTC amounts');
      }
    } else {
      throw new Error('Unknown send amount');
    }

    // TODO: remove this once we cashu-ts supports amountless lightning invoices
    if (!invoice.amountMsat) {
      throw new Error(
        "Cashu ts lib doesn't support amountless lightning invoices yet",
      );
    }

    const cashuUnit = getCashuUnit(account.currency);
    const wallet = getCashuWallet(account.mintUrl, {
      unit: cashuUnit,
    });

    const meltQuote = await wallet.createMeltQuote(paymentRequest);

    return {
      paymentRequest,
      amountRequested: amount ?? (amountRequestedInBtc as Money<Currency>),
      amountRequestedInBtc,
      meltQuote,
    };
  }

  /**
   * Creates the send quote but does not initiate the send.
   */
  async createSendQuote({
    userId,
    account,
    sendQuote,
  }: {
    /**
     * ID of the sender.
     */
    userId: string;
    /**
     * The account to send the money from.
     */
    account: CashuAccount;
    /**
     * The send quote to create.
     */
    sendQuote: SendQuoteRequest;
  }) {
    const cashuUnit = getCashuUnit(account.currency);
    const wallet = getCashuWallet(account.mintUrl, {
      unit: cashuUnit,
    });
    const keys = await wallet.getKeys();
    const keysetId = keys.id;

    const meltQuote = sendQuote.meltQuote;
    const totalAmountToSend = meltQuote.amount + meltQuote.fee_reserve;
    const expiresAt = new Date(meltQuote.expiry * 1000).toISOString();

    const proofs = wallet.selectProofsToSend(
      account.proofs,
      totalAmountToSend,
      false,
    );

    const maxPotentialChangeAmount = sumProofs(proofs.send) - meltQuote.amount;
    const numberOfChangeOutputs =
      maxPotentialChangeAmount === 0
        ? 0
        : Math.ceil(Math.log2(maxPotentialChangeAmount)) || 1;
    const keysetCounter = account.keysetCounters[keysetId];

    return this.cashuSendRepository.create({
      userId: userId,
      accountId: account.id,
      paymentRequest: sendQuote.paymentRequest,
      expiresAt,
      amountRequested: sendQuote.amountRequested,
      amountRequestedInMsat: sendQuote.amountRequestedInBtc.toNumber('msat'),
      amountToSend: new Money({
        amount: meltQuote.amount,
        currency: account.currency,
        unit: cashuUnit,
      }),
      feeReserve: new Money({
        amount: meltQuote.fee_reserve,
        currency: account.currency,
        unit: cashuUnit,
      }),
      quoteId: meltQuote.quote,
      keysetId,
      keysetCounter,
      numberOfChangeOutputs,
      proofsToSend: proofs.send,
      accountVersion: account.version,
      proofsToKeep: proofs.keep,
    });
  }

  /**
   * Initiates the send for the quote.
   */
  async initiateSend(
    account: CashuAccount,
    sendQuote: CashuSendQuote,
    meltQuote: MeltQuoteResponse,
  ) {
    if (account.id !== sendQuote.accountId) {
      throw new Error('Account does not match');
    }

    if (sendQuote.quoteId !== meltQuote.quote) {
      throw new Error('Quote does not match');
    }

    if (sendQuote.state !== 'UNPAID') {
      throw new Error(`Send is not unpaid. Current state: ${sendQuote.state}`);
    }

    const cashuUnit = getCashuUnit(account.currency);
    const seed = await this.cryptography.getSeed();
    const wallet = getCashuWallet(account.mintUrl, {
      unit: cashuUnit,
      bip39seed: seed,
    });

    return wallet.meltProofs(meltQuote, sendQuote.proofs, {
      keysetId: sendQuote.keysetId,
      counter: sendQuote.keysetCounter,
    });
  }

  /**
   * Marks the send quote as pending. This indicates that the send is in progress.
   */
  async markSendQuoteAsPending(quote: CashuSendQuote) {
    if (quote.state !== 'UNPAID') {
      throw new Error(
        `Only unpaid cashu send quote can be marked as pending. Current state: ${quote.state}`,
      );
    }

    return this.cashuSendRepository.markAsPending({
      id: quote.id,
      version: quote.version,
    });
  }

  /**
   * Completes the send quote after successful payment.
   */
  async completeSendQuote(
    account: CashuAccount,
    sendQuote: CashuSendQuote,
    meltQuote: MeltQuoteResponse,
  ) {
    if (sendQuote.state !== 'PENDING') {
      throw new Error(
        `Cannot complete send quote that is not pending. Current state: ${sendQuote.state}`,
      );
    }

    if (account.id !== sendQuote.accountId) {
      throw new Error('Account does not match the quote account');
    }

    if (meltQuote.quote !== sendQuote.quoteId) {
      throw new Error('Quote does not match');
    }

    if (meltQuote.state !== MeltQuoteState.PAID) {
      throw new Error(
        `Cannot complete send. Melt quote is not paid. Current state: ${meltQuote.state}`,
      );
    }

    if (!meltQuote.payment_preimage) {
      throw new Error('Payment preimage is missing on the melt quote');
    }

    const cashuUnit = getCashuUnit(account.currency);
    const seed = await this.cryptography.getSeed();
    const wallet = getCashuWallet(account.mintUrl, {
      unit: cashuUnit,
      bip39seed: seed,
    });

    // We are creating output data here in the same way that cashu-ts does in the meltProofs function.
    // This is needed because we need the deterministic output data to be able to convert the change signatures to proofs.
    // See https://github.com/cashubtc/cashu-ts/issues/287 for more details. If cashu-ts eventually exposes the way to create
    // blank outputs we will be able to simplify this.
    const keys = await wallet.getKeys(sendQuote.keysetId);
    const amounts = sendQuote.numberOfChangeOutputs
      ? Array(sendQuote.numberOfChangeOutputs).fill(1)
      : [];
    const outputData = OutputData.createDeterministicData(
      amounts.length,
      seed,
      sendQuote.keysetCounter,
      keys,
      amounts,
    );
    const changeProofs =
      meltQuote.change?.map((s, i) => outputData[i].toProof(s, keys)) ?? [];

    const updatedAccountProofs = [...account.proofs, ...changeProofs];

    const amountSpent = new Money({
      amount: sumProofs(sendQuote.proofs) - sumProofs(changeProofs),
      currency: account.currency,
      unit: cashuUnit,
    });

    return this.cashuSendRepository.complete({
      quoteId: sendQuote.id,
      quoteVersion: sendQuote.version,
      paymentPreimage: meltQuote.payment_preimage,
      amountSpent,
      accountProofs: updatedAccountProofs,
      accountVersion: account.version,
    });
  }

  /**
   * Expires the cashu send quote by setting the state to EXPIRED.
   * It also updates the account proofs to return the unspent proofs that were reserved for the send.
   */
  async expireSendQuote(
    account: CashuAccount,
    quote: CashuSendQuote,
  ): Promise<void> {
    if (quote.state === 'EXPIRED') {
      return;
    }

    if (quote.state !== 'UNPAID') {
      throw new Error('Cannot expire quote that is not unpaid');
    }

    if (new Date(quote.expiresAt) > new Date()) {
      throw new Error('Cannot expire quote that has not expired yet');
    }

    const updatedAccountProofs = account.proofs.concat(quote.proofs);

    await this.cashuSendRepository.expire({
      id: quote.id,
      version: quote.version,
      accountProofs: updatedAccountProofs,
      accountVersion: account.version,
    });
  }
}

export function useCashuSendQuoteService() {
  const cryptography = useCashuCryptography();
  const cashuSendQuoteRepository = useCashuSendQuoteRepository();
  return new CashuSendQuoteService(cryptography, cashuSendQuoteRepository);
}

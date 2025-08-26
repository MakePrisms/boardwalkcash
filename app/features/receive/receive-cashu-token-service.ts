import type {
  MeltQuoteResponse,
  MintQuoteResponse,
  Token,
} from '@cashu/cashu-ts';
import { getCashuUnit, getCashuWallet, getWalletCurrency } from '~/lib/cashu';
import { Money } from '~/lib/money';
import type { CashuAccount } from '../accounts/account';
import { tokenToMoney } from '../shared/cashu';
import type { CashuReceiveQuote } from './cashu-receive-quote';
import {
  type CashuReceiveLightningQuote,
  type CashuReceiveQuoteService,
  useCashuReceiveQuoteService,
} from './cashu-receive-quote-service';

type CrossMintQuotesResult = {
  /** Mint quote from the destination wallet */
  mintQuote: MintQuoteResponse;
  /** Melt quote from the source wallet */
  meltQuote: MeltQuoteResponse;
  /** Amount to mint */
  amountToMint: Money;
};

export class ReceiveCashuTokenService {
  constructor(
    private readonly cashuReceiveQuoteService: CashuReceiveQuoteService,
  ) {}

  /**
   * Sets up quotes and prepares for cross mint/currency token claim.
   * This will create a cashu-receive-quote in the database.
   */
  async createCrossAccountReceiveQuotes({
    userId,
    token,
    account,
    exchangeRate,
  }: {
    userId: string;
    token: Token;
    account: CashuAccount;
    exchangeRate: string;
  }): Promise<{
    cashuReceiveQuote: CashuReceiveQuote;
    cashuMeltQuote: MeltQuoteResponse;
  }> {
    const tokenAmount = tokenToMoney(token);
    const fromCashuUnit = getCashuUnit(tokenAmount.currency);
    const toCashuUnit = getCashuUnit(account.currency);

    if (
      this.areMintUrlsEqual(account.mintUrl, token.mint) &&
      fromCashuUnit === toCashuUnit
    ) {
      throw new Error(
        'Must melt token to a different mint or currency than source',
      );
    }

    const quotes = await this.getCrossMintQuotesWithinTargetAmount({
      token,
      account,
      targetAmount: tokenAmount,
      exchangeRate,
    });

    const sourceWallet = account.wallet;
    await sourceWallet.getKeys();
    const cashuReceiveFee = sourceWallet.getFeesForProofs(token.proofs);

    const cashuReceiveQuote =
      await this.cashuReceiveQuoteService.createReceiveQuote({
        userId,
        account,
        receiveType: 'TOKEN',
        receiveQuote: quotes.lightningQuote,
        cashuReceiveFee,
        tokenAmount,
      });

    return {
      cashuReceiveQuote,
      cashuMeltQuote: quotes.meltQuote,
    };
  }

  /**
   * Gets mint and melt quotes for claiming a token from one mint to another.
   */
  private async getCrossMintQuotesWithinTargetAmount({
    token,
    account,
    targetAmount,
    exchangeRate,
  }: {
    token: Token;
    account: CashuAccount;
    targetAmount: Money;
    exchangeRate: string;
  }): Promise<
    CrossMintQuotesResult & {
      lightningQuote: CashuReceiveLightningQuote;
    }
  > {
    const tokenAmount = tokenToMoney(token);
    const fromCashuUnit = getCashuUnit(tokenAmount.currency);

    const sourceWallet = getCashuWallet(token.mint, {
      unit: fromCashuUnit,
    });

    const sourceCurrency = getWalletCurrency(sourceWallet);
    const destinationCurrency = account.currency;

    let attempts = 0;
    let amountToMelt = targetAmount;

    while (attempts < 5) {
      attempts++;

      const amountToMint = amountToMelt.convert(
        destinationCurrency,
        exchangeRate,
      );
      const amountToMintNumber = amountToMint.toNumber(
        getCashuUnit(destinationCurrency),
      );

      if (amountToMintNumber < 1) {
        throw new Error('Amount is too small to get cross mint quotes');
      }

      const lightningQuote =
        await this.cashuReceiveQuoteService.getLightningQuote({
          account,
          amount: amountToMint,
        });

      const meltQuote = await sourceWallet.createMeltQuote(
        lightningQuote.mintQuote.request,
      );

      const amountRequired = new Money({
        amount: meltQuote.amount + meltQuote.fee_reserve,
        currency: sourceCurrency,
        unit: getCashuUnit(sourceCurrency),
      });

      const diff = amountRequired.subtract(targetAmount);

      if (diff.lessThanOrEqual(Money.zero(diff.currency))) {
        return {
          mintQuote: lightningQuote.mintQuote,
          meltQuote,
          amountToMint,
          lightningQuote,
        };
      }

      amountToMelt = amountToMelt.subtract(diff);
    }

    throw new Error('Failed to find valid quotes after 5 attempts.');
  }

  private areMintUrlsEqual(url1: string, url2: string): boolean {
    const normalize = (url: string) => url.replace(/\/+$/, '').toLowerCase();
    return normalize(url1) === normalize(url2);
  }
}

export function useReceiveCashuTokenService() {
  const cashuReceiveQuoteService = useCashuReceiveQuoteService();
  return new ReceiveCashuTokenService(cashuReceiveQuoteService);
}

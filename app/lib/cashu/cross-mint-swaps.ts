import type {
  CashuWallet,
  MeltQuoteResponse,
  MintQuoteResponse,
} from '@cashu/cashu-ts';
import { ExchangeRateService } from '../exchange-rate';
import type { Ticker } from '../exchange-rate';
import { type Currency, Money } from '../money';
import { getCashuUnit, getWalletCurrency } from './utils';

type GetCrossMintQuotesParams = {
  /**
   * Source wallet to create melt quote from
   */
  source: CashuWallet;
  /**
   * Destination wallet to create mint quote to
   */
  destination: CashuWallet;
  /**
   * Amount to melt in source currency.
   * This is the amount that the user wants to receive.
   */
  requestedAmountToMelt: Money;
};

type GetCrossMintQuotesResult = {
  /** Mint quote for the destination wallet */
  mintQuote: MintQuoteResponse;
  /** Melt quote for the source wallet */
  meltQuote: MeltQuoteResponse;
  /** Amount to mint */
  amountToMint: Money;
};

/**
 * Get mint and melt quotes for the maximum amount that can be melted from the source wallet.
 * We do not know the fee for the melt quote ahead of time, so we need to guess and check.
 * We try up to 5 times to find a quotes that are as close to `requestedAmountToMelt`
 * without exceeding it.
 * @returns The mint and melt quotes for the swap along with amount to mint.
 */
export const getCrossMintQuotesForMaxAmount = async ({
  source,
  destination,
  requestedAmountToMelt,
}: GetCrossMintQuotesParams): Promise<GetCrossMintQuotesResult> => {
  const fromCurrency = getWalletCurrency(source);
  const toCurrency = getWalletCurrency(destination);
  const exchangeRate = await getExchangeRate(fromCurrency, toCurrency);
  let attempts = 0;
  let amountToMelt = requestedAmountToMelt;

  while (attempts < 5) {
    attempts++;

    const amountToMint = amountToMelt.convert(toCurrency, exchangeRate);
    const amountToMintNumber = amountToMint.toNumber(getCashuUnit(toCurrency));

    if (amountToMintNumber < 1) {
      throw new Error('Amount is too small to get cross mint quotes');
    }

    const mintQuote = await destination.createMintQuote(amountToMintNumber);
    const meltQuote = await source.createMeltQuote(mintQuote.request);

    const amountRequired = new Money({
      amount: meltQuote.amount + meltQuote.fee_reserve,
      currency: fromCurrency,
      unit: getCashuUnit(fromCurrency),
    });

    const diff = amountRequired.subtract(requestedAmountToMelt);

    if (diff.lessThanOrEqual(Money.zero(diff.currency))) {
      return { mintQuote, meltQuote, amountToMint };
    }

    amountToMelt = amountToMelt.subtract(diff);
  }

  throw new Error('Failed to find valid quotes after 5 attempts.');
};

const getExchangeRate = async (
  fromCurrency: Currency,
  toCurrency: Currency,
): Promise<string> => {
  const ticker: Ticker = `${fromCurrency}-${toCurrency}`;
  const rates = await new ExchangeRateService().getRates({
    tickers: [ticker],
  });
  return rates[ticker];
};

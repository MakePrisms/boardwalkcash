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
   * Source wallet to melt tokens from. This wallet will be used to create a melt quote.
   */
  sourceWallet: CashuWallet;
  /**
   * Destination wallet to mint tokens to. This wallet will be used to create a mint quote.
   */
  destinationWallet: CashuWallet;
  /**
   * Target amount to melt in source currency.
   */
  targetAmount: Money;
  /**
   * The public key to lock the mint quote to.
   */
  nut20LockingPublicKey: string;
};

type GetCrossMintQuotesResult = {
  /** Mint quote from the destination wallet */
  mintQuote: MintQuoteResponse;
  /** Melt quote from the source wallet */
  meltQuote: MeltQuoteResponse;
  /** Amount to mint */
  amountToMint: Money;
};

/**
 * Gets mint and melt quotes for claiming a token from one mint to another.
 *
 * @returns The mint and melt quotes with the maximum possible transfer amount after accounting for fees.
 */
export const getCrossMintQuotesWithinTargetAmount = async ({
  sourceWallet,
  destinationWallet,
  targetAmount,
  nut20LockingPublicKey,
}: GetCrossMintQuotesParams): Promise<GetCrossMintQuotesResult> => {
  const sourceCurrency = getWalletCurrency(sourceWallet);
  const destinationCurrency = getWalletCurrency(destinationWallet);
  const exchangeRate = await getExchangeRate(
    sourceCurrency,
    destinationCurrency,
  );
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

    const mintQuote = await destinationWallet.createLockedMintQuote(
      amountToMintNumber,
      nut20LockingPublicKey,
    );
    const meltQuote = await sourceWallet.createMeltQuote(mintQuote.request);

    const amountRequired = new Money({
      amount: meltQuote.amount + meltQuote.fee_reserve,
      currency: sourceCurrency,
      unit: getCashuUnit(sourceCurrency),
    });

    const diff = amountRequired.subtract(targetAmount);

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

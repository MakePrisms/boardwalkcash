import { MoneyDisplay } from '~/components/money-display';
import { Skeleton } from '~/components/ui/skeleton';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import type { Currency, Money } from '~/lib/money';
import { getDefaultUnit } from './currencies';

/**
 * Helper function to determine what currency to convert to for display.
 * Returns the other currency if conversion should be shown, undefined otherwise.
 * - Always show conversion to default fiat currency from BTC and non-default fiat.
 * - Always show conversion to account currency from non-BTC if account currency is provided.
 * - Don't show conversion for default fiat currency.
 */
export const getConversionCurrency = ({
  money,
  defaultFiatCurrency = 'USD',
  accountCurrency,
}: {
  money: Money;
  defaultFiatCurrency?: Currency;
  accountCurrency?: Currency;
}): Currency | undefined => {
  // If receiving to an account with different currency, show conversion to account currency
  if (accountCurrency && accountCurrency !== money.currency) {
    return accountCurrency;
  }

  // Show BTC amounts in default fiat
  if (money.currency === 'BTC') {
    return defaultFiatCurrency;
  }

  // Show non-default fiat amounts in BTC
  if (money.currency !== defaultFiatCurrency) {
    return 'BTC';
  }

  // Don't show conversion for default fiat currency
  return undefined;
};

export const MoneyWithConvertedAmount = ({
  money,
  otherCurrency,
  variant = 'default',
}: {
  money: Money;
  variant?: 'default' | 'inline';
  otherCurrency?: Currency;
}) => {
  const shouldShowConversion =
    otherCurrency && otherCurrency !== money.currency;

  const exchangeRateQuery = useExchangeRate(
    shouldShowConversion
      ? `${money.currency}-${otherCurrency}`
      : `${money.currency}-${money.currency}`,
  );

  const unit = getDefaultUnit(money.currency);

  const conversionData = shouldShowConversion
    ? {
        rate: exchangeRateQuery.data,
        error: exchangeRateQuery.error,
        loading: exchangeRateQuery.isLoading,
        unit: getDefaultUnit(otherCurrency),
        convertedMoney: exchangeRateQuery.data
          ? money.convert(otherCurrency, exchangeRateQuery.data)
          : null,
      }
    : null;

  return variant === 'default' ? (
    <div className="flex min-h-[116px] flex-col items-center">
      <MoneyDisplay money={money} unit={unit} />
      {conversionData && (
        <>
          {conversionData.loading && <Skeleton className="h-6 w-32" />}
          {!conversionData.error && conversionData.convertedMoney && (
            <MoneyDisplay
              money={conversionData.convertedMoney}
              unit={conversionData.unit}
              variant="secondary"
            />
          )}
        </>
      )}
    </div>
  ) : (
    <span className="text-muted-foreground text-sm">
      {money.toLocaleString({ unit })}
      {conversionData && (
        <>
          {conversionData.loading && (
            <Skeleton className="ml-1 inline-block h-4 w-10" />
          )}
          {!conversionData.error &&
            conversionData.convertedMoney &&
            ` (~${conversionData.convertedMoney.toLocaleString({
              unit: conversionData.unit,
            })})`}
        </>
      )}
    </span>
  );
};

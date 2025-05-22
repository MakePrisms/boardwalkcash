import { MoneyDisplay } from '~/components/money-display';
import { Skeleton } from '~/components/ui/skeleton';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import type { Money } from '~/lib/money';
import { getDefaultUnit } from './currencies';

export const MoneyWithConvertedAmount = ({
  money,
  variant = 'default',
}: {
  money: Money;
  variant?: 'default' | 'inline';
}) => {
  const defaultFiatCurrency = 'USD';
  const convertedCurrency =
    money.currency === 'BTC' ? defaultFiatCurrency : 'BTC';
  const {
    data: rate,
    error: exchangeRateError,
    isLoading: exchangeRateLoading,
  } = useExchangeRate(`${money.currency}-${convertedCurrency}`);

  const shouldShowConvertedAmount =
    money.currency === 'BTC' || money.currency !== defaultFiatCurrency;

  const unit = getDefaultUnit(money.currency);
  const convertedUnit = getDefaultUnit(convertedCurrency);

  return variant === 'default' ? (
    <div className="flex min-h-[116px] flex-col items-center">
      <MoneyDisplay money={money} unit={unit} />
      {shouldShowConvertedAmount && (
        <>
          {exchangeRateLoading && <Skeleton className="h-6 w-32" />}
          {!exchangeRateError && rate && (
            <MoneyDisplay
              money={money.convert(convertedCurrency, rate)}
              unit={convertedUnit}
              variant="secondary"
            />
          )}
        </>
      )}
    </div>
  ) : (
    <span className="text-muted-foreground text-sm">
      {money.toLocaleString({ unit })}
      {shouldShowConvertedAmount && (
        <>
          {exchangeRateLoading && (
            <Skeleton className="ml-1 inline-block h-4 w-10" />
          )}
          {!exchangeRateError &&
            rate &&
            ` (~${money.convert(convertedCurrency, rate).toLocaleString({
              unit: getDefaultUnit(convertedCurrency),
            })})`}
        </>
      )}
    </span>
  );
};

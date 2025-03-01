import { MoneyDisplay } from '~/components/money-display';
import { Skeleton } from '~/components/ui/skeleton';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import type { Money } from '~/lib/money';
import { getDefaultUnit } from './currencies';

export const MoneyWithConvertedAmount = ({ money }: { money: Money }) => {
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

  return (
    <div className="flex min-h-[116px] flex-col items-center">
      <MoneyDisplay money={money} unit={getDefaultUnit(money.currency)} />
      {shouldShowConvertedAmount && (
        <>
          {exchangeRateLoading && <Skeleton className="h-6 w-32" />}
          {!exchangeRateError && rate && (
            <MoneyDisplay
              money={money.convert(convertedCurrency, rate)}
              unit={getDefaultUnit(convertedCurrency)}
              variant="secondary"
            />
          )}
        </>
      )}
    </div>
  );
};

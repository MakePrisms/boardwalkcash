import { MoneyDisplay } from '~/components/money-display';
import { Skeleton } from '~/components/ui/skeleton';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import type { Money } from '~/lib/money';
import { cn } from '~/lib/utils';
import { getDefaultUnit } from './currencies';

export const MoneyWithConvertedAmount = ({ money }: { money: Money }) => {
  const defaultFiatCurrency = 'USD';
  const {
    data: rate,
    error: exchangeRateError,
    isLoading: exchangeRateLoading,
  } = useExchangeRate(
    `${money.currency}-${money.currency === 'BTC' ? defaultFiatCurrency : 'BTC'}`,
  );
  const shouldShowConvertedAmount =
    money.currency === 'BTC' || money.currency !== defaultFiatCurrency;

  const height = shouldShowConvertedAmount ? 'min-h-[116px]' : 'min-h-[94px]';

  if (exchangeRateLoading) {
    return (
      <div className={cn('flex flex-col items-center gap-2', height)}>
        <MoneyDisplay money={money} unit={getDefaultUnit(money.currency)} />
        {shouldShowConvertedAmount && <Skeleton className="h-6 w-32" />}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center', height)}>
      <MoneyDisplay
        money={money}
        unit={getDefaultUnit(money.currency)}
        className="mb-[-10px]"
      />
      {!exchangeRateError && rate && shouldShowConvertedAmount && (
        <MoneyDisplay
          money={money.convert(
            money.currency === 'BTC' ? defaultFiatCurrency : 'BTC',
            rate,
          )}
          unit={getDefaultUnit(
            money.currency === 'BTC' ? defaultFiatCurrency : 'BTC',
          )}
          variant="secondary"
        />
      )}
    </div>
  );
};

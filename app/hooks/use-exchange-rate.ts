import { useQuery } from '@tanstack/react-query';
import { CURRENCIES } from '~/env';
import { exchangeRateService } from '~/lib/exchange-rate';

// Create a union type of all possible currency pairs
type ExchangeRatePair = (typeof CURRENCIES)[number];
type ValidTicker = {
  [From in ExchangeRatePair]: {
    [To in ExchangeRatePair]: From extends To ? never : `${From}-${To}`;
  }[ExchangeRatePair];
}[ExchangeRatePair];

// Define ExchangeRates type with explicit ticker pairs
export type AppRates = {
  timestamp: number;
} & {
  [K in ValidTicker]: number;
};

export type AppCurrency = (typeof CURRENCIES)[number];

const tickers = CURRENCIES.flatMap((from) =>
  CURRENCIES.filter((to) => from !== to).map(
    (to) => `${from}-${to}` as const as ValidTicker,
  ),
);

export const useExchangeRate = () => {
  const { data: rates } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: async ({ signal }) => {
      const result = await exchangeRateService.getRates({ tickers, signal });
      return result as unknown as AppRates;
    },
    initialData: {} as AppRates,
  });

  const getRate = (from: AppCurrency, to: AppCurrency) => {
    if (from === to) {
      return 1;
    }
    const ticker = `${from}-${to}` as ValidTicker;
    const rate = rates[ticker];
    if (!rate) {
      throw new Error(`Rate not found for ${ticker}`);
    }
    return rate;
  };

  return { getRate };
};

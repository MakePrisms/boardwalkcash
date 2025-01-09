import { useQuery } from '@tanstack/react-query';
import { CURRENCIES } from '~/env';
import {
  type Rates,
  type Ticker,
  exchangeRateService,
} from '~/lib/exchange-rate';

export type AppCurrency = (typeof CURRENCIES)[number];

const tickers = CURRENCIES.flatMap((from) =>
  CURRENCIES.filter((to) => from !== to).map((to): Ticker => `${from}-${to}`),
);

export const useExchangeRate = () => {
  const { data: rates } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: async ({ signal }) => {
      return exchangeRateService.getRates({ tickers, signal });
    },
    initialData: {} as Rates,
  });

  const getRate = (from: AppCurrency, to: AppCurrency) => {
    if (from === to) {
      return 1;
    }
    const ticker: Ticker = `${from}-${to}`;
    const rate = rates[ticker];
    if (!rate) {
      throw new Error(`Rate not found for ${ticker}`);
    }
    return rate;
  };

  return { getRate };
};

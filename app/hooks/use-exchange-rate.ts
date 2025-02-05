import { useQuery } from '@tanstack/react-query';
import { type Ticker, exchangeRateService } from '~/lib/exchange-rate';

export const useExchangeRate = (ticker: Ticker) => {
  return useQuery({
    queryKey: ['exchangeRate', ticker],
    queryFn: async ({ signal }) => {
      return exchangeRateService
        .getRates({
          tickers: [ticker],
          signal,
        })
        .then((rates) => rates[ticker]);
    },
    refetchInterval: 15_000,
  });
};

export const useExchangeRates = (tickers: Ticker[]) => {
  return useQuery({
    queryKey: ['exchangeRate', tickers],
    queryFn: async ({ signal }) => {
      return exchangeRateService.getRates({
        tickers,
        signal,
      });
    },
    refetchInterval: 15_000,
  });
};

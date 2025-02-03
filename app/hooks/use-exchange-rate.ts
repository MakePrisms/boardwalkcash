import { useQuery } from '@tanstack/react-query';
import { type Ticker, exchangeRateService } from '~/lib/exchange-rate';

export const useExchangeRate = (ticker: Ticker) => {
  const {
    data: rates,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['exchangeRate', ticker],
    queryFn: async ({ signal }) => {
      return exchangeRateService.getRates({
        tickers: [ticker],
        signal,
      });
    },
    refetchInterval: 15_000,
  });

  return {
    rate: rates?.[ticker],
    isLoading,
    error,
  };
};

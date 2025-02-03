import { useQuery } from '@tanstack/react-query';
import { type Ticker, exchangeRateService } from '~/lib/exchange-rate';

type ExchangeRateResult =
  | {
      rate: string;
      isLoading: false;
      error: null;
    }
  | {
      rate: undefined;
      isLoading: true;
      error: null;
    }
  | {
      rate: undefined;
      isLoading: false;
      error: Error;
    };

export const useExchangeRate = (ticker: Ticker): ExchangeRateResult => {
  const {
    data: rates,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: async ({ signal }) => {
      return exchangeRateService.getRates({
        tickers: ['BTC-USD', 'USD-BTC', 'USD-USD', 'BTC-BTC'],
        signal,
      });
    },
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return {
      rate: undefined,
      isLoading: true,
      error: null,
    };
  }

  if (error) {
    return {
      rate: undefined,
      isLoading: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }

  if (!rates) {
    return {
      rate: undefined,
      isLoading: false,
      error: new Error(`Rate not found for ticker ${ticker}`),
    };
  }

  return {
    rate: rates[ticker],
    isLoading: false,
    error: null,
  };
};

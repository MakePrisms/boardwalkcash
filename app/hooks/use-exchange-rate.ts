import { useQuery } from '@tanstack/react-query';
import {
  type Rates,
  type Ticker,
  exchangeRateService,
} from '~/lib/exchange-rate';

export const useExchangeRate = (ticker: Ticker) => {
  const { data: rates } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: async ({ signal }) => {
      return exchangeRateService.getRates({
        tickers: ['BTC-USD', 'USD-BTC', 'USD-USD', 'BTC-BTC'],
        signal,
      });
    },
    // This is a workaround to make the type of the data not have | undefined.
    // In our case the initial data will be what was prefetched on the server but react query doesn't know that we are
    // doing prefetching there. I asked a question here to see if there is a better way
    // https://github.com/TanStack/query/discussions/1331#discussioncomment-11607342
    initialData: {} as Rates,
  });

  return rates[ticker];
};

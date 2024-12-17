// QUESTION: Should I be allowed to import from the lib folder?
import { fetchWithTimeout } from '../fetch';
import type { ExchangeRates, RateSource } from './types';

async function fetchMempoolRates(): Promise<ExchangeRates> {
  const response = await fetchWithTimeout(
    'https://mempool.space/api/v1/prices',
  );
  const data = await response.json();
  return {
    BTCUSD: data.USD,
    timestamp: Date.now(),
  };
}

async function fetchCoinbaseRates(): Promise<ExchangeRates> {
  const response = await fetchWithTimeout(
    'https://api.coinbase.com/v2/prices/BTC-USD/spot',
  );
  const data = await response.json();
  return {
    BTCUSD: Number.parseFloat(data.data.amount),
    timestamp: Date.now(),
  };
}

async function fetchCoingeckoRates(): Promise<ExchangeRates> {
  const response = await fetchWithTimeout(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  );
  const data = await response.json();
  return {
    BTCUSD: data.bitcoin.usd,
    timestamp: Date.now(),
  };
}

async function fetchAverageRates(): Promise<ExchangeRates> {
  const ratePromises = [
    fetchMempoolRates().catch(() => null),
    fetchCoinbaseRates().catch(() => null),
    fetchCoingeckoRates().catch(() => null),
  ];

  const rates = await Promise.all(ratePromises);
  const validRates = rates.filter(
    (rate): rate is ExchangeRates => rate !== null,
  );

  if (validRates.length === 0) {
    throw new Error('All rate sources failed to fetch');
  }

  const avgRate =
    validRates.reduce((sum, rate) => sum + rate.BTCUSD, 0) / validRates.length;
  return {
    BTCUSD: avgRate,
    timestamp: Date.now(),
  };
}

const ratesFetchersWithFallback: Record<
  RateSource,
  () => Promise<ExchangeRates>
> = {
  mempool: async () => {
    try {
      return await fetchMempoolRates();
    } catch {
      return fetchCoinbaseRates().catch(() => fetchCoingeckoRates());
    }
  },
  coinbase: async () => {
    try {
      return await fetchCoinbaseRates();
    } catch {
      return fetchMempoolRates().catch(() => fetchCoingeckoRates());
    }
  },
  coingecko: async () => {
    try {
      return await fetchCoingeckoRates();
    } catch {
      return fetchMempoolRates().catch(() => fetchCoinbaseRates());
    }
  },
  average: fetchAverageRates,
};

export async function fetchRates(
  source: RateSource = 'average',
): Promise<ExchangeRates> {
  const fetcher = ratesFetchersWithFallback[source];
  if (!fetcher) {
    throw new Error(`Unsupported rate source: ${source}`);
  }

  return fetcher();
}

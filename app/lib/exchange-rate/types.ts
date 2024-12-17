export type ExchangeRates = {
  /**
   * USD per BTC
   */
  BTCUSD: number;
  /**
   * Unix timestamp of when the rates were fetched
   */
  timestamp: number;
};

/**
 * The source of the exchange rates. 'average' averages the other sources.
 */
export type RateSource = 'mempool' | 'coinbase' | 'coingecko' | 'average';

// TODO: this should probably be moved
export type Unit = 'usd' | 'cent' | 'sat' | 'btc';

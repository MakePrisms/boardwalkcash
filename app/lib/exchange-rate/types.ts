export type GetRatesParams = {
  tickers: string[];
  signal: AbortSignal;
};

export interface ExchangeRateProvider {
  supportedTickers: string[];
  getRates(params: GetRatesParams): Promise<Rates>;
}

export type Rates = {
  timestamp: number;
  [ticker: string]: number;
};

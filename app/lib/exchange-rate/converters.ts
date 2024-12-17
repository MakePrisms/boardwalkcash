import type { ExchangeRates, Unit } from './types';

function convertSatsToCents(satsAmount: number, rates: ExchangeRates): number {
  const btcAmount = satsAmount / 100_000_000;
  return Math.round(btcAmount * rates.BTCUSD * 100);
}

function convertCentsToSats(centsAmount: number, rates: ExchangeRates): number {
  const usdAmount = centsAmount / 100;
  const btcAmount = usdAmount / rates.BTCUSD;
  return Math.round(btcAmount * 100_000_000);
}

/**
 * Convert between any supported units, with exchange rates required for cross-currency conversions
 */
export function convertToUnit(
  amount: number,
  fromUnit: Unit,
  toUnit: Unit,
  rates?: ExchangeRates,
): number {
  if (fromUnit === toUnit) return amount;

  // Handle BTC <-> sat conversions
  if (fromUnit === 'btc' && toUnit === 'sat')
    return Math.round(amount * 100_000_000);
  if (fromUnit === 'sat' && toUnit === 'btc') return amount / 100_000_000;

  // Handle USD <-> cent conversions
  if (fromUnit === 'usd' && toUnit === 'cent') return Math.round(amount * 100);
  if (fromUnit === 'cent' && toUnit === 'usd') return amount / 100;

  // Handle cross-currency conversions
  if (!rates) {
    throw new Error('Exchange rates required for cross-currency conversion');
  }

  // Convert BTC/sat to USD/cent
  if (
    (fromUnit === 'btc' || fromUnit === 'sat') &&
    (toUnit === 'usd' || toUnit === 'cent')
  ) {
    const sats = fromUnit === 'btc' ? Math.round(amount * 100_000_000) : amount;
    const cents = convertSatsToCents(sats, rates);
    return toUnit === 'usd' ? cents / 100 : cents;
  }

  // Convert USD/cent to BTC/sat
  if (
    (fromUnit === 'usd' || fromUnit === 'cent') &&
    (toUnit === 'btc' || toUnit === 'sat')
  ) {
    const cents = fromUnit === 'usd' ? Math.round(amount * 100) : amount;
    const sats = convertCentsToSats(cents, rates);
    return toUnit === 'btc' ? sats / 100_000_000 : sats;
  }

  throw new Error(`Invalid conversion from ${fromUnit} to ${toUnit}`);
}

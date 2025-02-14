import type { Token } from '@cashu/cashu-ts';
import { type Currency, type CurrencyUnit, Money } from '~/lib/money';

export function getCurrencyFromCashuUnit(unit: CurrencyUnit): Currency {
  if (unit === 'sat') {
    return 'BTC';
  }
  if (unit === 'cent') {
    return 'USD';
  }
  throw new Error(`Invalid Cashu unit ${unit}`);
}

export function tokenToMoney(token: Token): Money {
  const { currency, unit } = getCurrencyAndUnitFromToken(token);
  const amount = token.proofs.reduce((acc, proof) => acc + proof.amount, 0);
  return new Money<Currency>({
    amount,
    currency,
    unit,
  });
}

function getCurrencyAndUnitFromToken(token: Token): {
  currency: Currency;
  unit: CurrencyUnit;
  formatUnit: 'sat' | 'usd';
} {
  if (token.unit === 'sat') {
    return { currency: 'BTC', unit: 'sat', formatUnit: 'sat' };
  }
  if (token.unit === 'usd') {
    return { currency: 'USD', unit: 'cent', formatUnit: 'usd' };
  }
  throw new Error(`Invalid token unit ${token.unit}`);
}

import type { Token } from '@cashu/cashu-ts';
import { type Currency, type CurrencyUnit, Money } from '~/lib/money';

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

export function tokenToMoney(token: Token): Money {
  const { currency, unit } = getCurrencyAndUnitFromToken(token);
  const amount = token.proofs.reduce((acc, proof) => acc + proof.amount, 0);
  return new Money<Currency>({
    amount,
    currency,
    unit,
  });
}

import type { Token } from '@cashu/cashu-ts/dist/lib/es5/model/types';
import type { AppCurrency } from '~/hooks/use-exchange-rate';
import { type CurrencyUnit, Money } from '~/lib/money';

type TokenReturn<C extends AppCurrency> = {
  currency: C;
  unit: CurrencyUnit<C>;
  formatUnit: 'sat' | 'usd';
};

function getCurrencyAndUnitFromToken(token: Token): TokenReturn<AppCurrency> {
  if (token.unit === 'sat') {
    return { currency: 'BTC', unit: 'sat', formatUnit: 'sat' };
  }
  if (token.unit === 'usd') {
    return { currency: 'USD', unit: 'cent', formatUnit: 'usd' };
  }
  throw new Error(`Invalid token unit ${token.unit}`);
}

export function tokenToMoney(token: Token): Money<AppCurrency> {
  const { currency, unit } = getCurrencyAndUnitFromToken(token);
  const amount = token.proofs.reduce((acc, proof) => acc + proof.amount, 0);
  return new Money<AppCurrency>({
    amount,
    currency,
    unit,
  });
}

// TODO: figure out a better way to check if a mint is a test mint
export function isTestMint(mintUrl: string): boolean {
  const knownTestMints = [
    'https://testnut.cashu.space',
    'https://nofees.testnut.cashu.space',
  ];
  return knownTestMints.includes(mintUrl);
}

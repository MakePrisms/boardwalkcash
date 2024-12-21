import { Big } from 'big.js';
import { Money } from '../money';

const x = new Money({ amount: 1000, currency: 'USD' });

console.log('x.amount: ', x.amount());
console.log('x.toString(): ', x.toString());
console.log(
  'x.toLocaleString({ currency: false }): ',
  x.toLocaleString({ showCurrency: false }),
);
console.log(
  'x.toLocaleString({ currency: true, unit: "cent" }): ',
  x.toLocaleString({ showCurrency: true, unit: 'cent' }),
);

const y = new Money({ amount: 0.004567, currency: 'BTC' });

console.log('y.amount: ', y.amount());
console.log('y.toString(): ', y.toString());
console.log(
  'y.toLocaleString({ currency: true }): ',
  y.toLocaleString({ showCurrency: true }),
);

const z = new Money({ amount: 4567, currency: 'BTC', unit: 'sat' });

console.log('z.amount: ', z.amount());
console.log('z.amount("sat"): ', z.amount('sat'));
console.log('z.toString(): ', z.toString());
console.log(
  'z.toLocaleString({ currency: true }): ',
  z.toLocaleString({ showCurrency: true }),
);
console.log(
  'z.toLocaleString({ currency: true, unit: "sat" }): ',
  z.toLocaleString({ showCurrency: true, unit: 'sat' }),
);
console.log(
  'z.toLocaleString({ currency: true, unit: "msat" }): ',
  z.toLocaleString({ showCurrency: true, unit: 'msat' }),
);

const l = new Money({
  amount: 567,
  currency: 'BTC',
  unit: 'msat',
});

console.log('l.amount: ', l.amount());
console.log('l.amount("sat"): ', l.amount('sat'));
console.log('l.amount("msat"): ', l.amount('msat'));
console.log('l.toString(): ', l.toString());
console.log('l.toString("sat"): ', l.toString('sat'));
console.log('l.toString("msat"): ', l.toString('msat'));
console.log(
  'l.toLocaleString({ currency: true }): ',
  l.toLocaleString({ showCurrency: true }),
);
console.log(
  'l.toLocaleString({ currency: true, unit: "sat" }): ',
  l.toLocaleString({ showCurrency: true, unit: 'sat' }),
);
console.log(
  'l.toLocaleString({ currency: true, unit: "msat" }): ',
  l.toLocaleString({ showCurrency: true, unit: 'msat' }),
);

const usdAmount1 = new Money({ amount: 125000, currency: 'USD' });
const btcToUsdRate = 96_826.07;
const usdToBtcRate = new Big(1).div(btcToUsdRate);

const btcAmount1 = usdAmount1.convert('BTC', usdToBtcRate);

console.log('btcAmount1: ', btcAmount1.toString());

const btcAmount2 = new Money({ amount: 0.0034, currency: 'BTC' });
const usdAmount2 = btcAmount2.convert('USD', btcToUsdRate);

console.log('btcAmount1: ', usdAmount2.toString());

console.log('JSON.stringify(usdAmount2): ', JSON.stringify(usdAmount2));

const usd = new Money({ amount: 100, currency: 'USD' });
const btc = usd.convert('BTC', new Big(1).div(100_000));

console.log('usd: ', usd.toString());
console.log('btc: ', btc.toString());

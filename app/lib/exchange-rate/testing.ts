import { Big } from 'big.js';
import { Money } from '~/lib/exchange-rate/money';

const x = Money.of(0.1, 'USD');
const y = Money.of(0.2, 'USD');

console.log(x.add(y).toLocaleString('hr-HR'));

console.log(x.add(y).toLocaleString());
console.log(x.add(y).toFractionlessAmount().toLocaleString());

const btcToUsdRate = new Big(99978.41);
const usdToBtcRate = new Big(1).div(btcToUsdRate);
console.log('usdToBtcRate: ', usdToBtcRate);

const i = Money.of(100, 'USD').toCurrency('BTC', usdToBtcRate, 1 / 100_000_000);

console.log(i.toString());

// 1;
// btc = 99978.41;
// (usd) => (usd = 1 / 99978.41);
// btc;
//
// 100;
// usd = 100;

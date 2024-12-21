type Unit = 'usd' | 'cent' | 'btc' | 'sat';

export const formatUnit = (amount: number, unit: Unit): string => {
  const symbol = getUnitSymbol(unit);
  switch (unit) {
    case 'usd':
      return `${symbol}${Number(amount.toFixed(2)).toLocaleString()}`;
    case 'cent':
      return `${symbol}${Number((amount / 100).toFixed(2)).toLocaleString()}`;
    case 'btc':
      return `${symbol}${amount.toFixed(8)}`;
    case 'sat':
      return `${Number(amount.toFixed(0)).toLocaleString()}${symbol}`;
    default:
      return amount.toString();
  }
};

export const getUnitSymbol = (unit: Unit): string => {
  switch (unit) {
    case 'usd':
    case 'cent':
      return '$';
    case 'btc':
    case 'sat':
      return '₿';
    default:
      return '';
  }
};

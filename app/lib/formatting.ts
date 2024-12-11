export const formatUnit = (amount: number, unit: 'usd' | 'sat'): string => {
  if (unit === 'usd') {
    return `$${(amount / 100).toFixed(2)}`;
  }
  return `₿${amount}`;
};

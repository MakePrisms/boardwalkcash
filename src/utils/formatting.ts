export const formatCents = (cents: number) => {
   return `$${(cents / 100).toFixed(2)}`;
};

export const formatSats = (sats: number) => `${sats.toLocaleString()} sats`;

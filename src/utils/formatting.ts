export const formatCents = (cents: number, decimals = true) => {
   if (cents < 0) {
      throw new Error('Cents must be a non-negative number');
   }

   /* return whole dollars and do not show the cents, ONLY if there are 0 cents */
   if (!decimals) {
      const wholeDollars = cents / 100;
      if (!Number.isInteger(wholeDollars)) {
         throw new Error('Cannot format cents to whole dollars when there are remaining cents');
      }
      return `$${wholeDollars.toFixed(0)}`;
   }

   const formattedValue = (cents / 100).toFixed(2);
   if (!decimals && formattedValue.endsWith('.00')) {
      return `$${parseInt(formattedValue, 10)}`;
   }
   return `$${(cents / 100).toFixed(decimals ? 2 : 0)}`;
};

export const formatSats = (sats: number) => `${sats.toLocaleString()} sats`;

export const shortenString = (str: string, maxLength: number) => {
   if (str.length <= maxLength) {
      return str;
   }
   return `${str.slice(0, maxLength - 3)}...${str.slice(-4)}`;
};

import { Currency } from '@/types';
import { getDecodedToken, Token } from '@cashu/cashu-ts';

export const formatTokenAmount = (token: Token | string) => {
   const decodedToken = typeof token === 'string' ? getDecodedToken(token) : token;
   const amount = decodedToken.token[0].proofs.reduce((acc, p) => acc + p.amount, 0);
   return formatUnit(amount, decodedToken.unit);
};

export const formatUnit = (amount: number, unit?: string) => {
   if (unit === 'sat') {
      return formatSats(amount);
   } else if (unit === 'usd') {
      return formatCents(amount);
   } else if (unit === undefined) {
      /* the token probably didn't have the unit or unsupported unit */
      return amount.toString();
   } else {
      return `${amount.toString()} ${unit}`;
   }
};

export const getUnitSymbol = (unit: Currency) => {
   switch (unit) {
      case 'usd':
         return '$';
      case 'sat':
         return '₿';
      default:
         return '';
   }
};

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

export const formatSats = (sats: number) => `${sats.toLocaleString()}₿`;

export const shortenString = (str: string, maxLength: number) => {
   if (str.length <= maxLength) {
      return str;
   }
   return `${str.slice(0, maxLength - 3)}...${str.slice(-4)}`;
};

export const getSymbolForUnit = (unit: Currency) => {
   switch (unit) {
      case 'sat':
         return '₿';
      case 'usd':
         return '$';
      default:
         throw new Error('Invalid unit');
   }
};

import { useState } from 'react';

export const useExchangeRate = () => {
   const [lastFetched, setLastFetched] = useState<number>(0);
   const [usdToSatRate, setUsdToSatRate] = useState<number>(0);

   const fetchUsdToSatRate = async () => {
      // const storedRate = localStorage.getItem('usdToSatRate');

      if (lastFetched > Date.now() - 1000 * 60 * 5) {
         return usdToSatRate;
      }

      const usdBtc = await fetch('https://mempool.space/api/v1/prices')
         .then(res =>
            res.json().then(data => {
               console.log(data);
               setLastFetched(Date.now());
               return data.USD;
            }),
         )
         .catch(error => {
            console.error('Error fetching USD to BTC rate: ', error);
         });
      const usdSat = usdBtc / 100_000_000;
      setUsdToSatRate(usdSat);
      return usdSat;
   };

   const unitToSats = async (amount: number, unit: string): Promise<number> => {
      switch (unit) {
         case 'sat':
            return amount;
         case 'usd':
            const exchangeRate = await fetchUsdToSatRate();
            return Math.round(amount / exchangeRate);
         default:
            throw new Error('Invalid unit');
      }
   };

   const satsToUnit = async (amount: number, unit: string): Promise<number> => {
      console.log('satsToUnit', amount, unit);
      switch (unit) {
         case 'sat':
            return amount;
         case 'usd':
            const exchangeRate = await fetchUsdToSatRate();
            return Math.round(amount * exchangeRate * 100);
         default:
            throw new Error('Invalid unit');
      }
   };

   return { unitToSats, satsToUnit };
};

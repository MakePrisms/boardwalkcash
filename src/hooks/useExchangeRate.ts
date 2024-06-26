import { useCallback, useState } from 'react';

export const useExchangeRate = () => {
   const [lastFetched, setLastFetched] = useState<number>(0);
   const [usdToSatRate, setUsdToSatRate] = useState<number>(0);

   const fetchUsdToSatRate = useCallback(async () => {
      // const storedRate = localStorage.getItem('usdToSatRate');

      if (lastFetched > Date.now() - 1000 * 60 * 5) {
         return usdToSatRate;
      }

      const usdBtc = await fetch('https://mempool.space/api/v1/prices')
         .then(res =>
            res.json().then(data => {
               console.log(
                  `FETCHED EXCHANGE RATE FROM https://mempool.space/api/v1/prices: data = ${JSON.stringify(data)}`,
               );
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
   }, [lastFetched, usdToSatRate]);

   const unitToSats = useCallback(
      async (amount: number, unit: string): Promise<number> => {
         switch (unit) {
            case 'sat':
               return amount;
            case 'usd':
               const exchangeRate = await fetchUsdToSatRate();
               return Math.floor(amount / exchangeRate);
            default:
               throw new Error('Invalid unit');
         }
      },
      [fetchUsdToSatRate],
   );

   const satsToUnit = useCallback(
      async (amount: number, unit: string): Promise<number> => {
         switch (unit) {
            case 'sat':
               return amount;
            case 'usd':
               const exchangeRate = await fetchUsdToSatRate();
               return Math.floor(amount * exchangeRate * 100);
            default:
               throw new Error('Invalid unit');
         }
      },
      [fetchUsdToSatRate],
   );

   return { unitToSats, satsToUnit };
};

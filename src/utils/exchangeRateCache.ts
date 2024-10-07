let usdToSatRate: number | null = null;
const DEFAULT_USD_BTC_RATE = 60000;

export const getUsdToSatRate = async (): Promise<number> => {
   if (usdToSatRate !== null) {
      return usdToSatRate;
   }

   try {
      const response = await fetch('https://mempool.space/api/v1/prices');
      const data = await response.json();
      console.log(
         `FETCHED EXCHANGE RATE FROM https://mempool.space/api/v1/prices: data = ${JSON.stringify(data)}`,
      );
      const usdBtc = data.USD;
      usdToSatRate = usdBtc / 100_000_000;
   } catch (error) {
      console.error('Error fetching USD to BTC rate: ', error);

      const storedRate = localStorage.getItem('usdToSatRate');
      if (storedRate) {
         usdToSatRate = parseFloat(storedRate);
         console.log('Using stored usd to sat rate', usdToSatRate);
      } else {
         usdToSatRate = 1 / DEFAULT_USD_BTC_RATE / 100_000_000;
         console.log('Using default USD to BTC rate', DEFAULT_USD_BTC_RATE);
      }
   }

   localStorage.setItem('usdToSatRate', usdToSatRate.toString());
   return usdToSatRate;
};

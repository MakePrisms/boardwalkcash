const DEFAULT_USD_BTC_RATE = 60000;

const getUsdToSatRate = async (): Promise<number> => {
   try {
      const response = await fetch('https://mempool.space/api/v1/prices');
      const data = await response.json();
      console.log(
         `FETCHED EXCHANGE RATE FROM https://mempool.space/api/v1/prices: data = ${JSON.stringify(data)}`,
      );
      const usdBtc = data.USD;
      const newRate = usdBtc / 100_000_000;
      return newRate;
   } catch (error) {
      console.error('Error fetching USD to BTC rate: ', error);

      const defaultRate = 1 / DEFAULT_USD_BTC_RATE / 100_000_000;
      console.log('Using default USD to BTC rate', DEFAULT_USD_BTC_RATE);
      return defaultRate;
   }
};

const unitToSats = async (amount: number, unit: string): Promise<number> => {
   switch (unit) {
      case 'sat':
         return amount;
      case 'usd':
         const exchangeRate = await getUsdToSatRate();
         return Math.floor(amount / exchangeRate);
      default:
         throw new Error('Invalid unit');
   }
};

const satsToUnit = async (amount: number, unit: string): Promise<number> => {
   switch (unit) {
      case 'sat':
         return amount;
      case 'usd':
         const exchangeRate = await getUsdToSatRate();
         return Math.round(amount * exchangeRate * 100);
      default:
         throw new Error('Invalid unit');
   }
};

export const convertToUnit = async (amount: number, fromUnit: string, toUnit: string) => {
   if (fromUnit === toUnit) {
      return amount;
   } else if (fromUnit === 'usd') {
      console.log('converting usd to sats', amount);
      return await unitToSats(amount / 100, 'usd');
   } else if (fromUnit === 'sat') {
      console.log('converting sats to usd', amount);
      return await satsToUnit(amount, toUnit);
   } else {
      console.error('Invalid unit', fromUnit, toUnit);
      throw new Error('Invalid unit');
   }
};

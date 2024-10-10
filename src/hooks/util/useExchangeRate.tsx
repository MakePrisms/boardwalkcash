import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DEFAULT_USD_BTC_RATE = 60000;

interface ExchangeRateContextType {
   loading: boolean;
   unitToSats: (amount: number, unit: string) => Promise<number>;
   satsToUnit: (amount: number, unit: string) => Promise<number>;
   convertToUnit: (amount: number, fromUnit: string, toUnit: string) => Promise<number>;
}

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(undefined);

export const ExchangeRateProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
   const [loading, setLoading] = useState(true);
   const [usdToSatRate, setUsdToSatRate] = useState<number | null>(null);

   const getUsdToSatRate = useCallback(async (): Promise<number> => {
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
         const newRate = usdBtc / 100_000_000;
         setUsdToSatRate(newRate);
         return newRate;
      } catch (error) {
         console.error('Error fetching USD to BTC rate: ', error);

         const storedRate = localStorage.getItem('usdToSatRate');
         if (storedRate) {
            const parsedRate = parseFloat(storedRate);
            setUsdToSatRate(parsedRate);
            console.log('Using stored usd to sat rate', parsedRate);
            return parsedRate;
         } else {
            const defaultRate = 1 / DEFAULT_USD_BTC_RATE / 100_000_000;
            setUsdToSatRate(defaultRate);
            console.log('Using default USD to BTC rate', DEFAULT_USD_BTC_RATE);
            return defaultRate;
         }
      }
   }, [usdToSatRate]);

   useEffect(() => {
      getUsdToSatRate().finally(() => setLoading(false));
   }, [getUsdToSatRate]);

   useEffect(() => {
      if (usdToSatRate !== null) {
         localStorage.setItem('usdToSatRate', usdToSatRate.toString());
      }
   }, [usdToSatRate]);

   const unitToSats = useCallback(
      async (amount: number, unit: string): Promise<number> => {
         switch (unit) {
            case 'sat':
               return amount;
            case 'usd':
               const exchangeRate = await getUsdToSatRate();
               return Math.floor(amount / exchangeRate);
            default:
               throw new Error('Invalid unit');
         }
      },
      [getUsdToSatRate],
   );

   const satsToUnit = useCallback(
      async (amount: number, unit: string): Promise<number> => {
         switch (unit) {
            case 'sat':
               return amount;
            case 'usd':
               const exchangeRate = await getUsdToSatRate();
               return Math.round(amount * exchangeRate * 100);
            default:
               throw new Error('Invalid unit');
         }
      },
      [getUsdToSatRate],
   );

   const convertToUnit = useCallback(
      async (amount: number, fromUnit: string, toUnit: string) => {
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
      },
      [unitToSats, satsToUnit],
   );

   return (
      <ExchangeRateContext.Provider value={{ loading, unitToSats, satsToUnit, convertToUnit }}>
         {children}
      </ExchangeRateContext.Provider>
   );
};

export const useExchangeRate = () => {
   const context = useContext(ExchangeRateContext);
   if (context === undefined) {
      throw new Error('useExchangeRate must be used within an ExchangeRateProvider');
   }
   return context;
};

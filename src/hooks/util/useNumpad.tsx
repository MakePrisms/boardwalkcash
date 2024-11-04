import { Currency } from '@/types';
import { useEffect, useMemo, useState } from 'react';

interface UseNumpadProps {
   activeUnit?: Currency;
}

export const useNumpad = ({ activeUnit }: UseNumpadProps = {}) => {
   const [inputValue, setInputValue] = useState('');

   useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
         const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
         const showDecimal = activeUnit === Currency.USD;

         if (numbers.includes(e.key) || e.key === '0') {
            handleNumpadInput(e.key);
         } else if (e.key === '.' && showDecimal) {
            handleNumpadInput('.');
         } else if (e.key === 'Backspace') {
            handleNumpadBackspace();
         }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
   }, [activeUnit]);

   const handleNumpadInput = (input: string) => {
      if (input === '.') {
         /* Only add decimal if one doesn't exist yet and we're in USD mode */
         if (!inputValue.includes('.') && activeUnit === Currency.USD) {
            setInputValue(prev => prev + input);
         }
         return;
      }

      /* If we already have 2 decimal places, don't add more digits */
      const decimalIndex = inputValue.indexOf('.');
      if (decimalIndex !== -1 && inputValue.length - decimalIndex > 2) {
         return;
      }

      setInputValue(prev => prev + input);
   };

   const handleNumpadBackspace = () => {
      setInputValue(prev => prev.slice(0, -1));
   };

   const clearNumpadInput = () => {
      setInputValue('');
   };

   const numpadValueIsEmpty = useMemo(() => inputValue === '' || inputValue === '.', [inputValue]);

   const numpadAmount = useMemo(() => {
      const parsedAmount = parseFloat(inputValue);
      if (isNaN(parsedAmount)) {
         return;
      }
      return activeUnit === Currency.USD ? parsedAmount * 100 : parsedAmount;
   }, [inputValue]);

   return {
      numpadValue: inputValue,
      numpadAmount,
      numpadValueIsEmpty,
      setInputValue,
      handleNumpadInput,
      handleNumpadBackspace,
      clearNumpadInput,
   };
};

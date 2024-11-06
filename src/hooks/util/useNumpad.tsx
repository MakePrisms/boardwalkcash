import { Currency } from '@/types';
import { useEffect, useState } from 'react';

interface UseNumpadProps {
   showDecimal?: boolean;
}

export interface NumpadControls {
   numpadValue: string;
   numpadValueIsEmpty: boolean;
   handleNumpadInput: (input: string) => void;
   handleNumpadBackspace: () => void;
}

const numpadChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'];

export const useNumpad = ({ showDecimal }: UseNumpadProps = {}) => {
   const [inputValue, setInputValue] = useState('');

   useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
         if (numpadChars.includes(e.key)) {
            handleNumpadInput(e.key);
         } else if (e.key === 'Backspace') {
            handleNumpadBackspace();
         }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
   }, []);

   const handleNumpadInput = (input: string) => {
      if (input === '.') {
         /* Only add decimal if one doesn't exist yet and we're in USD mode */
         if (!inputValue.includes('.') && showDecimal) {
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

   const numpadValueIsEmpty = inputValue === '' || inputValue === '.';

   return {
      numpadValue: inputValue,
      numpadValueIsEmpty,
      setInputValue,
      handleNumpadInput,
      handleNumpadBackspace,
      clearNumpadInput,
   };
};

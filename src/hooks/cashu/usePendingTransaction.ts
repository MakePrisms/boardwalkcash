import { PendingMintQuote } from '@/types';
import { useLocalStorage } from 'usehooks-ts';

export const usePendingTransaction = () => {
   const [pendingMintQuotes, setPendingMintQuotes] = useLocalStorage<PendingMintQuote[]>(
      'pendingMintQuotes',
      [],
   );

   const addPendingMintQuote = (quote: PendingMintQuote) => {
      setPendingMintQuotes(prev => [...prev, quote]);
   };

   const removePendingMintQuote = (quoteId: string) => {
      setPendingMintQuotes(prev => prev.filter(q => q.quote !== quoteId));
   };

   return {
      pendingMintQuotes,
      addPendingMintQuote,
      removePendingMintQuote,
   };
};

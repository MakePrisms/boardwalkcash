import { CashuMint, MintQuoteState } from '@cashu/cashu-ts';
import { CashuWallet } from '@cashu/cashu-ts';
import { useQuery } from '@tanstack/react-query';
import { type PropsWithChildren, useEffect } from 'react';
import { useAccounts } from '../accounts/use-accounts';
import { boardwalkDb } from '../boardwalk-db/database';
import { useUserStore } from '../user/user-provider';

const useUnclaimedMintQuotes = () => {
  const user = useUserStore((s) => s.user);

  return useQuery({
    queryKey: ['unclaimed-mint-quotes', user.id],
    queryFn: async () => {
      const { data, error } = await boardwalkDb
        .from('mint_quotes')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
  });
};

export const Wallet = ({ children }: PropsWithChildren) => {
  const { data: accounts } = useAccounts();
  const { data: unclaimedMintQuotes } = useUnclaimedMintQuotes();

  useEffect(() => {
    if (unclaimedMintQuotes?.length) {
      console.log('unclaimedMintQuotes', unclaimedMintQuotes);

      // Group quotes by account ID
      const quotesByAccount = unclaimedMintQuotes.reduce(
        (acc, quote) => {
          if (!acc[quote.account_id]) {
            acc[quote.account_id] = [];
          }
          acc[quote.account_id].push(quote);
          return acc;
        },
        {} as Record<string, typeof unclaimedMintQuotes>,
      );

      console.log('quotesByAccount', quotesByAccount);

      // Process quotes for each account
      Object.entries(quotesByAccount).forEach(async ([accountId, quotes]) => {
        const account = accounts.find((a) => a.id === accountId);
        if (!account || account.type !== 'cashu') return;

        const wallet = new CashuWallet(new CashuMint(account.mintUrl));

        wallet.onMintQuoteUpdates(
          quotes.map((q) => q.quote_id),
          async (quote) => {
            console.log('quote', quote);
            if (quote.state === MintQuoteState.PAID) {
              const bwQuote = quotes.find((q) => q.quote_id === quote.quote);
              if (!bwQuote) return;
              const mintProofs = await wallet.mintProofs(
                bwQuote.amount,
                quote.quote,
              );
              console.log('mintProofs', mintProofs);
              await boardwalkDb
                .from('mint_quotes')
                .delete()
                .eq('id', bwQuote.id);
            }
          },
          (error) => {
            console.error('error', error);
          },
        );

        // // Process all quotes for this account
        // for (const quote of quotes) {
        //   await boardwalkDb.from('mint_quotes').delete().eq('id', quote.id);
        //   const mintProofs = await wallet.mintProofs(quote.amount, quote.quote_id);
        //   console.log('mintProofs', mintProofs);
        // }
      });
    }
  }, [unclaimedMintQuotes, accounts]);

  if (!accounts.length) {
    return (
      <div className="flex h-screen w-full items-center justify-center px-4">
        <div>Setting up wallet...</div>
      </div>
    );
  }

  return children;
};

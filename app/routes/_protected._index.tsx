import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import { ArrowDownRight, ArrowUpRight, Bell, Cog } from 'lucide-react';
import { useState } from 'react';
import { MoneyDisplay } from '~/components/money-display';
import { Page, PageContent, PageFooter } from '~/components/page';
import { Button } from '~/components/ui/button';
import type { Account } from '~/features/accounts/account-selector';
import { useTheme } from '~/features/theme';
import { useAuthActions } from '~/features/user/auth';
import type { Rates } from '~/lib/exchange-rate/providers/types';
import { Money } from '~/lib/money';
import { LinkWithViewTransition } from '~/lib/transitions';

export const accounts: Account[] = [
  {
    id: '1',
    name: 'Testnut',
    currency: 'BTC',
    type: 'cashu',
    mintUrl: 'https://testnut.cashu.space',
    balance: new Big(0.00000054),
  },
  {
    id: '2',
    name: 'Start9',
    currency: 'BTC',
    type: 'nwc',
    nwcUrl: 'nwc connection string',
    balance: new Big(0.00000321),
  },
  {
    id: '3',
    name: 'Stablenut',
    currency: 'USD',
    type: 'cashu',
    mintUrl: 'https://stablenut.umint.cash.',
    balance: new Big(1.21),
  },
];

export default function Index() {
  const { signOut } = useAuthActions();
  const [showSatsPerDollar, setShowSatsPerDollar] = useState(false);
  const { theme, effectiveColorMode, colorMode, setTheme, setColorMode } =
    useTheme();
  const { data: rates } = useQuery({
    queryKey: ['exchangeRate'],
    // This is a workaround to make the type of the data not have | undefined.
    // In our case the initial data will be what was prefetched on the server but react query doesn't know that we are
    // doing prefetching there. I asked a question here to see if there is a better way
    // https://github.com/TanStack/query/discussions/1331#discussioncomment-11607342
    initialData: {} as Rates,
  });

  const balanceBTC: Money<'BTC'> = accounts.reduce(
    (acc, account) => {
      let accountBalance: Money<'BTC'>;
      if (account.currency === 'BTC') {
        accountBalance = new Money({
          amount: account.balance,
          currency: 'BTC',
        });
      } else {
        accountBalance = new Money({
          amount: account.balance,
          currency: account.currency,
        }).convert('BTC', rates[`${account.currency}-BTC`]);
      }
      return acc.add(accountBalance);
    },
    new Money({ amount: 0, currency: 'BTC' }),
  );

  const balanceUSD: Money<'USD'> = balanceBTC.convert('USD', rates['BTC-USD']);

  return (
    <Page>
      <header className="flex items-center justify-between">
        <LinkWithViewTransition
          to="/notifications"
          transition="slideRight"
          applyTo="newView"
        >
          <Bell />
        </LinkWithViewTransition>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowSatsPerDollar(!showSatsPerDollar)}
          >
            {showSatsPerDollar
              ? new Money({ amount: 1, currency: 'USD' })
                  .convert('BTC', rates['USD-BTC'])
                  .toLocaleString({ unit: 'sat' })
              : new Money({
                  amount: rates['BTC-USD'],
                  currency: 'USD',
                }).toLocaleString({ unit: 'usd' })}
          </button>
        </div>

        <LinkWithViewTransition
          to="/settings"
          transition="slideLeft"
          applyTo="newView"
        >
          <Cog />
        </LinkWithViewTransition>
      </header>

      <p className="text-center text-lg">Welcome to Boardwalk!</p>

      <PageContent className="items-center justify-around">
        {theme === 'usd' ? (
          <MoneyDisplay money={balanceUSD} unit="usd" />
        ) : (
          <MoneyDisplay money={balanceBTC} unit="sat" />
        )}
        <div className="grid grid-cols-2 gap-4">
          <Button className="text-lg">
            Receive <ArrowDownRight />
          </Button>
          <Button className="text-lg">
            Send <ArrowUpRight />
          </Button>
        </div>
      </PageContent>
      <PageFooter className="flex flex-row justify-around">
        <Button
          className="w-fit"
          onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
        >
          {effectiveColorMode}
        </Button>
        <Button onClick={signOut}>Log Out</Button>
        <Button
          className="w-fit"
          onClick={() => setTheme(theme === 'usd' ? 'btc' : 'usd')}
        >
          {theme}
        </Button>
      </PageFooter>
    </Page>
  );
}

import type { LinksFunction } from '@remix-run/node';
import { ArrowDownRight, ArrowUpRight, Cog } from 'lucide-react';
import { useState } from 'react';
import boardwalkIcon192 from '~/assets/icon-192x192.png';
import { MoneyDisplay } from '~/components/money-display';
import {
  Page,
  PageContent,
  PageFooter,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { useAccounts } from '~/features/accounts/account-hooks';
import { DefaultCurrencySwitcher } from '~/features/accounts/default-currency-switcher';
import { InstallPwaPrompt } from '~/features/pwa/install-pwa-prompt';
import { useTheme } from '~/features/theme';
import { useAuthActions } from '~/features/user/auth';
import { useExchangeRates } from '~/hooks/use-exchange-rate';
import { sumProofs } from '~/lib/cashu';
import type { Ticker } from '~/lib/exchange-rate';
import { type Currency, Money } from '~/lib/money';
import { LinkWithViewTransition } from '~/lib/transitions';

export const links: LinksFunction = () => [
  // This icon is used in the PWA dialog and prefetched here to avoid a flash while loading
  { rel: 'preload', href: boardwalkIcon192, as: 'image' },
];

const useBalance = (currency: Currency) => {
  const { data: accounts } = useAccounts(currency);
  const balance = accounts.reduce(
    (acc, account) => {
      const accountBalance =
        account.type === 'cashu'
          ? new Money({
              amount: sumProofs(account.proofs),
              currency: account.currency,
              unit: account.currency === 'USD' ? 'usd' : 'sat',
            })
          : new Money({ amount: 0, currency: account.currency });
      return acc.add(accountBalance);
    },
    new Money({ amount: 0, currency }),
  );
  return balance;
};

export default function Index() {
  const { signOut } = useAuthActions();
  const [showSatsPerDollar, setShowSatsPerDollar] = useState(false);
  const { theme, effectiveColorMode, colorMode, setColorMode } = useTheme();
  const { data: rates } = useExchangeRates(
    (['BTC-USD', 'USD-BTC'] as Ticker[]).sort(),
  );

  const balanceBTC = useBalance('BTC');
  const balanceUSD = useBalance('USD');

  return (
    <Page>
      <PageHeader>
        <PageHeaderTitle>
          <button
            type="button"
            onClick={() => setShowSatsPerDollar(!showSatsPerDollar)}
          >
            {showSatsPerDollar && rates
              ? new Money({ amount: 1, currency: 'USD' })
                  .convert('BTC', rates['USD-BTC'])
                  .toLocaleString({ unit: 'sat' })
              : rates &&
                new Money({
                  amount: rates['BTC-USD'],
                  currency: 'USD',
                }).toLocaleString({ unit: 'usd' })}
          </button>
        </PageHeaderTitle>
        <LinkWithViewTransition
          to="/settings"
          transition="slideLeft"
          applyTo="newView"
        >
          <Cog />
        </LinkWithViewTransition>
      </PageHeader>

      <p className="text-center text-lg">Welcome to Boardwalk!</p>

      <PageContent className="items-center justify-around">
        {theme === 'usd' ? (
          <MoneyDisplay money={balanceUSD} unit="usd" />
        ) : (
          <MoneyDisplay money={balanceBTC} unit="sat" />
        )}
        <DefaultCurrencySwitcher />
        <div className="grid grid-cols-2 gap-4">
          <LinkWithViewTransition
            to="/receive"
            transition="slideUp"
            applyTo="newView"
          >
            <Button className="text-lg">
              Receive <ArrowDownRight />
            </Button>
          </LinkWithViewTransition>
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
      </PageFooter>
      <InstallPwaPrompt />
    </Page>
  );
}

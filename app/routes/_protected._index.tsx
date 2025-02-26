import type { LinksFunction } from '@remix-run/node';
import { ArrowDownRight, ArrowUpRight, ChartSpline, Cog } from 'lucide-react';
import { useState } from 'react';
import { Page, PageContent, PageHeader } from '~/components/page';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { DefaultCurrencySwitcher } from '~/features/accounts/default-currency-switcher';
import { BalanceDisplay } from '~/features/balance';
import { InstallPwaPrompt } from '~/features/pwa/install-pwa-prompt';
import { links as pwaLinks } from '~/features/pwa/install-pwa-prompt';
import { useExchangeRates } from '~/hooks/use-exchange-rate';
import type { Ticker } from '~/lib/exchange-rate';
import { Money } from '~/lib/money';
import { LinkWithViewTransition } from '~/lib/transitions';

export const links: LinksFunction = () => [...pwaLinks()];

const Price = () => {
  const [showSatsPerDollar, setShowSatsPerDollar] = useState(false);
  const { data: rates } = useExchangeRates(
    ['BTC-USD', 'USD-BTC'].sort() as Ticker[],
  );

  if (!rates) return <Skeleton className="h-6 w-24" />;

  const moneyString = showSatsPerDollar
    ? new Money({ amount: 1, currency: 'USD' })
        .convert('BTC', rates['USD-BTC'])
        .toLocaleString({ unit: 'sat' })
    : new Money({ amount: rates['BTC-USD'], currency: 'USD' })
        .toLocaleString({ unit: 'usd' })
        .slice(0, -3);

  return (
    <button
      type="button"
      onClick={() => setShowSatsPerDollar(!showSatsPerDollar)}
      className="flex items-center gap-2 text-muted-foreground"
    >
      {showSatsPerDollar && <ChartSpline size={16} />}
      <span>{moneyString}</span>
      {!showSatsPerDollar && <ChartSpline size={16} />}
    </button>
  );
};

export default function Index() {
  return (
    <>
      <Page className="relative">
        <PageHeader className="z-10">
          <LinkWithViewTransition
            to="/settings"
            transition="slideLeft"
            applyTo="newView"
            aria-label="Settings"
          >
            <Cog />
          </LinkWithViewTransition>
        </PageHeader>

        <PageContent className="absolute inset-0 mx-auto flex flex-col items-center justify-center gap-24">
          <div className="flex flex-col items-center">
            <BalanceDisplay />
            <Price />
          </div>
          <DefaultCurrencySwitcher />

          <div className="grid grid-cols-2 gap-10 pt-3">
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
      </Page>
      <InstallPwaPrompt />
    </>
  );
}

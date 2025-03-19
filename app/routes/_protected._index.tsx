import type { LinksFunction } from '@remix-run/node';
import { ArrowDownRight, ArrowUpRight, Clock, Cog } from 'lucide-react';
import boardwalkIcon192 from '~/assets/icon-192x192.png';
import { MoneyDisplay } from '~/components/money-display';
import { Page, PageContent, PageFooter } from '~/components/page';
import { Button } from '~/components/ui/button';
import { DefaultCurrencySwitcher } from '~/features/accounts/default-currency-switcher';
import { InstallPwaPrompt } from '~/features/pwa/install-pwa-prompt';
import { useTheme } from '~/features/theme';
import { useAuthActions } from '~/features/user/auth';
import { Money } from '~/lib/money';
import { LinkWithViewTransition } from '~/lib/transitions';

export const links: LinksFunction = () => [
  // This icon is used in the PWA dialog and prefetched here to avoid a flash while loading
  { rel: 'preload', href: boardwalkIcon192, as: 'image' },
];

export default function Index() {
  const { signOut } = useAuthActions();
  const { theme, effectiveColorMode, colorMode, setColorMode } = useTheme();

  const balanceBTC = new Money({ amount: 0, currency: 'BTC' });
  const balanceUSD = new Money({ amount: 0, currency: 'USD' });

  return (
    <Page>
      <header className="flex w-full items-center justify-end gap-4">
        <LinkWithViewTransition
          to="/transactions"
          transition="slideLeft"
          applyTo="newView"
        >
          <Clock />
        </LinkWithViewTransition>
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

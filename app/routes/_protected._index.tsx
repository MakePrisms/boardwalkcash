import { ArrowDownRight, ArrowUpRight, Bell, Clock, Cog } from 'lucide-react';
import { MoneyDisplay } from '~/components/money-display';
import { Page, PageContent, PageFooter } from '~/components/page';
import { Button } from '~/components/ui/button';
import { useTheme } from '~/features/theme';
import { useAuthActions } from '~/features/user/auth';
import { Money } from '~/lib/money';
import { LinkWithViewTransition } from '~/lib/transitions';

export default function Index() {
  const { signOut } = useAuthActions();
  const { theme, effectiveColorMode, colorMode, setTheme, setColorMode } =
    useTheme();

  const balanceBTC = new Money({ amount: 0, currency: 'BTC' });
  const balanceUSD = new Money({ amount: 0, currency: 'USD' });

  return (
    <Page>
      <header className="flex w-full items-center justify-between">
        <LinkWithViewTransition
          to="/notifications"
          transition="slideRight"
          applyTo="newView"
        >
          <Bell />
        </LinkWithViewTransition>
        <div className="flex items-center justify-between gap-4">
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
        </div>
      </header>

      <p className="text-center text-lg">Welcome to Boardwalk!</p>

      <PageContent className="items-center justify-around">
        {theme === 'usd' ? (
          <MoneyDisplay money={balanceUSD} unit="usd" />
        ) : (
          <MoneyDisplay money={balanceBTC} unit="sat" />
        )}
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

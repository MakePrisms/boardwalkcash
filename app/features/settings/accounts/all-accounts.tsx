import { Plus } from 'lucide-react';
import { PageContent } from '~/components/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { getAccountBalance } from '~/features/accounts/account';
import { useAccounts } from '~/features/accounts/account-hooks';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { getDefaultUnit } from '~/features/shared/currencies';
import { useUser } from '~/features/user/user-hooks';
import { LinkWithViewTransition } from '~/lib/transitions';
import type { Currency } from '~/lib/money';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { MoneyDisplay } from '~/components/money-display';
import { ScrollArea } from '~/components/ui/scroll-area';

function CurrencyAccounts({ currency }: { currency: Currency }) {
  const { data: accounts } = useAccounts({ currency });
  const unit = getDefaultUnit(currency);

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <LinkWithViewTransition
          key={account.id}
          to={`/settings/accounts/${account.id}`}
          transition="slideLeft"
          applyTo="newView"
          className="block"
        >
          <Card className="flex items-center justify-between p-2 px-4 transition-colors hover:bg-muted/50">
            <h3 className="font-medium">{account.name}</h3>
            <MoneyDisplay
              money={getAccountBalance(account)}
              unit={unit}
              variant="secondary"
            />
          </Card>
        </LinkWithViewTransition>
      ))}
    </div>
  );
}

const tabs = [
  { title: 'Bitcoin', value: 'BTC' },
  { title: 'USD', value: 'USD' },
] as const;

const getTab = (currency: Currency) => {
  return tabs.find((x) => x.value === currency) ?? tabs[0];
};

export default function AllAccounts() {
  const defaultCurrency = useUser((x) => x.defaultCurrency);
  const defaultTab = getTab(defaultCurrency);

  return (
    <>
      <SettingsViewHeader
        title="Accounts"
        navBack={{
          to: '/settings',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        <Tabs defaultValue={defaultTab.value}>
          <TabsList className="grid w-full grid-cols-2 bg-primary">
            {tabs.map((tab) => (
              <TabsTrigger value={tab.value} key={tab.value}>
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent value={tab.value} key={tab.value} className="mt-8">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <CurrencyAccounts currency={tab.value} />
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </PageContent>

      <div className="fixed inset-x-0 bottom-16 flex justify-center">
        <Button asChild size="lg">
          <LinkWithViewTransition
            to="/settings/accounts/create"
            transition="slideLeft"
            applyTo="newView"
          >
            <Plus size={18} />
            <span>Add Account</span>
          </LinkWithViewTransition>
        </Button>
      </div>
    </>
  );
}

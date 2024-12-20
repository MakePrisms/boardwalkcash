import { Plus } from 'lucide-react';
import { PageContent } from '~/components/page';
import { Separator } from '~/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { SettingsNavButton } from '~/features/settings/components/settings-nav-button';
import { SettingsViewHeader } from '~/features/settings/components/settings-view-header';
import { Money } from '~/lib/money';

export default function AllAccounts() {
  const tabs = [
    { title: 'Bitcoin', value: 'sat', index: 0 },
    { title: 'USD', value: 'usd', index: 1 },
  ];

  const getTabByUnit = (unit: string) => {
    return tabs.find((x) => x.value === unit) ?? tabs[0];
  };

  // TODO: get active unit from somewhere
  const activeUnit = 'sat';

  // hardcoded because I don't know what the data will look like
  const accounts = [
    {
      id: '123',
      name: 'Coinos',
      usdBalance: 10_000,
      satBalance: null,
    },
    {
      id: '123',
      name: 'Spark',
      usdBalance: 10_000,
      satBalance: 10_000,
    },
    {
      id: '123',
      name: 'Stablenut',
      usdBalance: 10_000,
      satBalance: null,
    },
  ];

  return (
    <>
      <SettingsViewHeader
        title="All Accounts"
        navBack={{
          to: '/settings',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        <Tabs defaultValue={getTabByUnit(activeUnit).value}>
          <TabsList className="grid w-full grid-cols-2">
            {tabs.map((tab) => (
              <TabsTrigger value={tab.value} key={tab.value}>
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={'sat'}>BTC accounts here</TabsContent>
          <TabsContent value={'usd'}>USD accounts here</TabsContent>
        </Tabs>

        <Separator />

        <SettingsNavButton to="/settings/accounts/create">
          <Plus />
          <span>Add Account</span>
        </SettingsNavButton>

        <Separator />

        {accounts.map((account) => (
          <SettingsNavButton key={account.name} to="/settings/accounts/123">
            <p>{account.name}</p>
            <p>
              {Money.create({
                amount: account.usdBalance,
                currency: 'USD',
              }).toLocaleString({ subunit: true })}
            </p>
            {account.satBalance && (
              <p>
                {Money.create({
                  amount: account.satBalance,
                  currency: 'BTC',
                  subunit: 'satoshi',
                }).toLocaleString({ subunit: true })}
              </p>
            )}
          </SettingsNavButton>
        ))}
      </PageContent>
    </>
  );
}

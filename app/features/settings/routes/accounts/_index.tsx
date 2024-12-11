import { Plus } from 'lucide-react';
import { SidebarContent, SidebarSeparator } from '~/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { SettingsNavButton } from '~/features/settings/components/settings-nav-button';
import { SettingsViewHeader } from '~/features/settings/components/settings-view-header';
import { formatUnit } from '~/lib/formatting';

export default function AllAccountsView() {
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
      <SettingsViewHeader title="All Accounts" />
      <SidebarContent>
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

        <SidebarSeparator />

        <SettingsNavButton to="/settings/accounts/create">
          <Plus />
          <span>Add Account</span>
        </SettingsNavButton>

        <SidebarSeparator />

        {accounts.map((account) => (
          <SettingsNavButton key={account.name} to="/settings/accounts/123">
            <p>{account.name}</p>
            <p>{formatUnit(account.usdBalance, 'usd')}</p>
            {account.satBalance && (
              <p>{formatUnit(account.satBalance, 'sat')}</p>
            )}
          </SettingsNavButton>
        ))}
      </SidebarContent>
    </>
  );
}

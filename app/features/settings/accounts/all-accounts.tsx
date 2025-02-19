import { Plus } from 'lucide-react';
import { PageContent } from '~/components/page';
import { Separator } from '~/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useAccounts } from '~/features/accounts/use-accounts';
import { SettingsNavButton } from '~/features/settings/ui/settings-nav-button';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { useUserStore } from '~/features/user/user-provider';
import { type Currency, Money } from '~/lib/money';

function CurrencyAccounts({ currency }: { currency: Currency }) {
  const { data: accounts } = useAccounts(currency);

  return (
    <>
      {accounts.map((account) => (
        <SettingsNavButton
          key={account.id}
          to={`/settings/accounts/${account.id}`}
        >
          <p>{account.name}</p>
          <p>
            {new Money({
              amount: 0, // TODO: see about balance
              currency,
            }).toLocaleString()}
          </p>
        </SettingsNavButton>
      ))}
    </>
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
  const defaultCurrency = useUserStore((x) => x.user.defaultCurrency);
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
          <TabsList className="grid w-full grid-cols-2">
            {tabs.map((tab) => (
              <TabsTrigger value={tab.value} key={tab.value}>
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent value={tab.value} key={tab.value}>
              <CurrencyAccounts currency={tab.value} />
            </TabsContent>
          ))}
        </Tabs>

        <Separator />

        <SettingsNavButton to="/settings/accounts/create">
          <Plus />
          <span>Add Account</span>
        </SettingsNavButton>

        <Separator />
      </PageContent>
    </>
  );
}

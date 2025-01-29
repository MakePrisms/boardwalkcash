import { PageContent } from '~/components/page';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { Money } from '~/lib/money';

export default function SingleAccount({ accountId }: { accountId: string }) {
  return (
    <>
      <SettingsViewHeader
        title="Single Account"
        navBack={{
          to: '/settings/accounts',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        {accountId === '123' && (
          <div>
            <p>Stablenut</p>
            <p>
              {new Money({ amount: 10_000, currency: 'USD' }).toLocaleString()}
            </p>
            <p>
              {new Money({ amount: 10_000, currency: 'BTC' }).toLocaleString()}
            </p>
          </div>
        )}
      </PageContent>
    </>
  );
}

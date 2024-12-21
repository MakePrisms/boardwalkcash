import { PageContent } from '~/components/page';
import { Money } from '~/lib/money';
import { SettingsViewHeader } from './components/settings-view-header';

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

import { PageContent } from '~/components/page';
import { formatUnit } from '~/lib/formatting';
import { SettingsViewHeader } from './components/settings-view-header';

export default function SingleAccount({ accountId }: { accountId: string }) {
  return (
    <>
      <SettingsViewHeader
        title="Single Account"
        navBack={{
          to: '/settings/accounts',
          direction: 'right',
          type: 'close',
        }}
      />
      <PageContent>
        {accountId === '123' && (
          <div>
            <p>Stablenut</p>
            <p>{formatUnit(10_000, 'usd')}</p>
            <p>{formatUnit(10_000, 'sat')}</p>
          </div>
        )}
      </PageContent>
    </>
  );
}

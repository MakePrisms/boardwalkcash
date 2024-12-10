import { SidebarContent } from '~/components/ui/sidebar';
import { formatUnit } from '~/lib/formatting';
import { SettingsViewHeader } from '../components/settings-view-header';

export const SingleAccountView = ({ accountID }: { accountID: string }) => {
  return (
    <>
      <SettingsViewHeader title="Single Account" />
      <SidebarContent>
        {accountID === '123' && (
          <div>
            <p>Stablenut</p>
            <p>{formatUnit(10_000, 'usd')}</p>
            <p>{formatUnit(10_000, 'sat')}</p>
          </div>
        )}
      </SidebarContent>
    </>
  );
};

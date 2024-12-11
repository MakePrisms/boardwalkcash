import { useParams } from '@remix-run/react';
import { SidebarContent } from '~/components/ui/sidebar';
import { formatUnit } from '~/lib/formatting';
import { SettingsViewHeader } from '../../components/settings-view-header';

export default function AccountView() {
  const { account_id } = useParams();

  return (
    <>
      <SettingsViewHeader title="Single Account" />
      <SidebarContent>
        {account_id === '123' && (
          <div>
            <p>Stablenut</p>
            <p>{formatUnit(10_000, 'usd')}</p>
            <p>{formatUnit(10_000, 'sat')}</p>
          </div>
        )}
      </SidebarContent>
    </>
  );
}

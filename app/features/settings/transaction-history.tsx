import { PageContent } from '~/components/page';
import { TransactionList } from '~/features/transactions/transaction-list';
import { SettingsViewHeader } from './ui/settings-view-header';

export default function TransactionHistory() {
  return (
    <>
      <SettingsViewHeader
        title="Transactions"
        navBack={{
          to: '/settings',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        <TransactionList />
      </PageContent>
    </>
  );
}

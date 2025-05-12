import { Page, PageContent } from '~/components/page';
import { SettingsViewHeader } from '~/features/settings/ui/settings-view-header';
import { TransactionDetails } from '~/features/transactions/transaction-details';
import { useTransaction } from '~/features/transactions/transaction-hooks';
import type { Route } from './+types/_protected.settings.transactions.$transactionId';

export default function TransactionDetailsPage({
  params: { transactionId },
}: Route.ComponentProps) {
  const transaction = useTransaction({ transactionId });

  return (
    <Page>
      <SettingsViewHeader
        title="Transaction"
        navBack={{
          to: '/settings/transactions',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      />
      <PageContent>
        {!transaction ? (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="text-muted-foreground">Transaction not found</span>
          </div>
        ) : (
          <TransactionDetails transaction={transaction} />
        )}
      </PageContent>
    </Page>
  );
}

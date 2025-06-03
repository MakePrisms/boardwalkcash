import {
  ClosePageButton,
  Page,
  PageContent,
  PageHeader,
} from '~/components/page';
import { TransactionDetails } from '~/features/transactions/transaction-details';
import { useSuspenseTransaction } from '~/features/transactions/transaction-hooks';
import type { Route } from './+types/_protected.transactions.$transactionId';

export default function TransactionDetailsPage({
  params: { transactionId },
}: Route.ComponentProps) {
  const { data: transaction } = useSuspenseTransaction(transactionId);

  return (
    <Page>
      <PageHeader>
        <ClosePageButton
          to="/transactions"
          transition="slideDown"
          applyTo="oldView"
        />
      </PageHeader>
      <PageContent>
        <TransactionDetails transaction={transaction} />
      </PageContent>
    </Page>
  );
}

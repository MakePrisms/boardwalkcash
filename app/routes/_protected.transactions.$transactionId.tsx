import { useSearchParams } from 'react-router';
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
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  return (
    <Page>
      <PageHeader>
        <ClosePageButton
          to={redirectTo ?? '/transactions'}
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

import {
  ClosePageButton,
  Page,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { useAccount } from '~/features/accounts/account-hooks';
import { TransactionDetails } from '~/features/transactions/transaction-details';
import { useSuspenseTransaction } from '~/features/transactions/transaction-hooks';
import type { Route } from './+types/_protected.transactions.$transactionId';

export default function TransactionDetailsPage({
  params: { transactionId },
}: Route.ComponentProps) {
  const { data: transaction } = useSuspenseTransaction(transactionId);
  const account = useAccount(transaction.accountId);

  return (
    <Page>
      <PageHeader>
        <ClosePageButton
          to="/transactions"
          transition="slideDown"
          applyTo="oldView"
        />
        <PageHeaderTitle>Transaction</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        {!transaction ? (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="text-muted-foreground">Transaction not found</span>
          </div>
        ) : (
          <TransactionDetails transaction={transaction} account={account} />
        )}
      </PageContent>
    </Page>
  );
}

import { useParams } from '@remix-run/react';
import {
  ClosePageButton,
  Page,
  PageContent,
  PageHeader,
} from '~/components/page';
import { Redirect } from '~/components/redirect';
import { TransactionDetails } from '~/features/transactions';
import { accounts } from './_protected._index';
import { mockTransactions } from './_protected.transactions._index';

export default function SingleTransactionPage() {
  const { txid } = useParams();
  const transaction = mockTransactions.find((t) => t.id === txid);
  if (!transaction) {
    return <Redirect to="/transactions" />;
  }
  const account = accounts.find((a) => a.id === transaction.accountId);
  if (!account) {
    throw new Error('Account for transaction not found');
  }
  return (
    <Page>
      <PageHeader>
        <ClosePageButton
          to="/transactions"
          transition="slideDown"
          applyTo="oldView"
        />
      </PageHeader>
      <PageContent className="items-center justify-around">
        <TransactionDetails transaction={transaction} account={account} />
      </PageContent>
    </Page>
  );
}

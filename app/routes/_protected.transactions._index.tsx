import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Page } from '~/components/page';
import { HistoryTable } from '~/features/transactions';
import { useTransactionHistory } from '~/features/transactions/use-transaction-history';

export default function TransactionHistoryIndex() {
  const transactions = useTransactionHistory();

  return (
    <Page>
      <PageHeader>
        <ClosePageButton to="/" transition="slideRight" applyTo="oldView" />
        <PageHeaderTitle>Activity</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        <HistoryTable transactions={transactions} />
      </PageContent>
    </Page>
  );
}

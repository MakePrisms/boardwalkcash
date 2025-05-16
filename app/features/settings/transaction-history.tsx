import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { TransactionList } from '~/features/transactions/transaction-list';

export default function TransactionHistory() {
  return (
    <>
      <PageHeader>
        <ClosePageButton to="/" transition="slideRight" applyTo="oldView" />
        <PageHeaderTitle>Transactions</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        <TransactionList />
      </PageContent>
    </>
  );
}

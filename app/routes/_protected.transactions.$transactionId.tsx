import {
  ClosePageButton,
  Page,
  PageContent,
  PageHeader,
} from '~/components/page';
import { useAccount } from '~/features/accounts/account-hooks';
import { useUnresolvedCashuSendSwaps } from '~/features/send/cashu-send-swap-hooks';
import { TransactionDetails } from '~/features/transactions/transaction-details';
import { useTransaction } from '~/features/transactions/transaction-hooks';
import type { Route } from './+types/_protected.transactions.$transactionId';

export default function TransactionDetailsPage({
  params: { transactionId },
}: Route.ComponentProps) {
  const { data: transaction } = useTransaction(transactionId);
  const account = useAccount(transaction.accountId);

  const { pending } = useUnresolvedCashuSendSwaps();
  const pendingCashuSendSwap = pending.find(
    (swap) => swap.transactionId === transactionId,
  );

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
        <TransactionDetails
          transaction={transaction}
          account={account}
          pendingCashuSendSwap={pendingCashuSendSwap}
        />
      </PageContent>
    </Page>
  );
}

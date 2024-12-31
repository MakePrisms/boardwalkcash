import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { accounts } from '~/routes/_protected._index';
import { AccountSelector } from '../accounts/account-selector';

export default function ReusablePaymentRequest({
  accountId,
}: { accountId?: string }) {
  return (
    <>
      <PageHeader>
        <ClosePageButton
          to="/receive"
          transition="slideDown"
          applyTo="oldView"
        />
        <PageHeaderTitle>Payment Request</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        <div>Insert payment request here</div>
        {accountId ? (
          <div>Account: {accountId}</div>
        ) : (
          <AccountSelector
            accounts={accounts}
            onSelect={() => console.log('account selected')}
          />
        )}
        <div>
          This can be a cashu request, lightning address, or any other reusable
          payment request
        </div>
        <div>
          We can make this only available for a specific account, or use put the
          account selector here to change where the payment request is received
        </div>
      </PageContent>
    </>
  );
}

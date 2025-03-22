import {
  Page,
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Redirect } from '~/components/redirect';
import {
  CreateCashuTokenConfirmation,
  PayBolt11Confirmation,
  PayCashuRequestConfirmation,
  type PaymentRequest,
  useSendStore,
} from '~/features/send';

const isCashu = (
  paymentRequest: PaymentRequest,
): paymentRequest is PaymentRequest & { type: 'cashu' } =>
  paymentRequest.type === 'cashu';

const isBolt11 = (
  paymentRequest: PaymentRequest,
): paymentRequest is PaymentRequest & { type: 'bolt11' } =>
  paymentRequest.type === 'bolt11';

export default function SendConfirmationPage() {
  const sendAccount = useSendStore((s) => s.account);
  const sendAmount = useSendStore((s) => s.amount);
  const paymentRequest = useSendStore((s) => s.paymentRequest);

  if (!sendAccount || !sendAmount) {
    return <Redirect to="/send" logMessage="Missing send amount or account" />;
  }

  if (sendAccount.type !== 'cashu') {
    return <Redirect to="/send" logMessage="Unsupported account type" />;
  }

  const renderPageContent = () => {
    if (paymentRequest && isCashu(paymentRequest)) {
      return (
        <PayCashuRequestConfirmation
          amount={sendAmount}
          paymentRequest={paymentRequest}
          account={sendAccount}
        />
      );
    }
    if (paymentRequest && isBolt11(paymentRequest)) {
      return (
        <PayBolt11Confirmation
          bolt11={paymentRequest.raw}
          inputAmount={sendAmount}
          account={sendAccount}
        />
      );
    }
    return (
      <CreateCashuTokenConfirmation amount={sendAmount} account={sendAccount} />
    );
  };

  return (
    <Page>
      <PageHeader>
        <PageBackButton to="/send" transition="slideDown" applyTo="oldView" />
        <PageHeaderTitle>Confirm Payment</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center gap-4">
        {renderPageContent()}
      </PageContent>
    </Page>
  );
}

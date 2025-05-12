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
  const lud16 = useSendStore((s) => s.lud16);

  if (!sendAccount || !sendAmount) {
    return <Redirect to="/send" logMessage="Missing send amount or account" />;
  }

  if (sendAccount.type !== 'cashu') {
    return <Redirect to="/send" logMessage="Unsupported account type" />;
  }

  return paymentRequest && isCashu(paymentRequest) ? (
    <PayCashuRequestConfirmation
      amount={sendAmount}
      paymentRequest={paymentRequest}
      account={sendAccount}
    />
  ) : paymentRequest && isBolt11(paymentRequest) ? (
    <PayBolt11Confirmation
      bolt11={paymentRequest.raw}
      lud16={lud16}
      inputAmount={sendAmount}
      account={sendAccount}
    />
  ) : (
    <CreateCashuTokenConfirmation amount={sendAmount} account={sendAccount} />
  );
}

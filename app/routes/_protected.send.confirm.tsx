import { Redirect } from '~/components/redirect';
import {
  CreateCashuTokenConfirmation,
  PayBolt11Confirmation,
  PayCashuRequestConfirmation,
  useSendStore,
} from '~/features/send';

export default function SendConfirmationPage() {
  const sendAccount = useSendStore((s) => s.account);
  const sendAmount = useSendStore((s) => s.amount);
  const sendType = useSendStore((s) => s.sendType);
  const destination = useSendStore((s) => s.destination);
  const displayDestination = useSendStore((s) => s.displayDestination);
  const quote = useSendStore((s) => s.quote);
  if (!sendAmount || !sendType || !sendAccount) {
    return <Redirect to="/send" logMessage="Missing send data" />;
  }

  if (sendAccount.type !== 'cashu') {
    return <Redirect to="/send" logMessage="Invalid sending account" />;
  }

  if (sendType === 'CASHU_PAYMENT_REQUEST') {
    if (!destination || sendAccount.type !== 'cashu') {
      return (
        <Redirect to="/send" logMessage="Invalid cashu payment request send" />
      );
    }

    return (
      <PayCashuRequestConfirmation
        amount={sendAmount}
        paymentRequest={destination}
        account={sendAccount}
      />
    );
  }

  if (['BOLT11_INVOICE', 'LN_ADDRESS', 'AGICASH_CONTACT'].includes(sendType)) {
    if (!destination || !displayDestination || !quote) {
      return <Redirect to="/send" logMessage="Missing destination data" />;
    }

    return (
      <PayBolt11Confirmation
        quote={quote}
        displayDestination={displayDestination}
        account={sendAccount}
        destination={destination}
      />
    );
  }

  if (sendType === 'CASHU_TOKEN') {
    return (
      <CreateCashuTokenConfirmation amount={sendAmount} account={sendAccount} />
    );
  }

  return <Redirect to="/send" logMessage="Invalid send type" />;
}

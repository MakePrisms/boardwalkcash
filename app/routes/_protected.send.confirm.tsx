import { Redirect } from '~/components/redirect';
import {
  CreateCashuTokenConfirmation,
  PayBolt11Confirmation,
  PayCashuRequestConfirmation,
} from '~/features/send';
import { useSendStore } from '~/features/send';

export default function SendConfirmationPage() {
  const {
    sendType,
    getSourceAccount,
    amount: sendAmount,
    destination,
    destinationDisplay,
    quote,
  } = useSendStore();
  const sendAccount = getSourceAccount();

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

  if (
    sendType === 'BOLT11_INVOICE' ||
    sendType === 'LN_ADDRESS' ||
    sendType === 'AGICASH_CONTACT'
  ) {
    if (!destination || !destinationDisplay || !quote) {
      return <Redirect to="/send" logMessage="Missing destination data" />;
    }

    return (
      <PayBolt11Confirmation
        account={sendAccount}
        quote={quote}
        destination={destination}
        destinationDisplay={destinationDisplay}
      />
    );
  }

  if (sendType === 'CASHU_TOKEN') {
    if (!quote) {
      return <Redirect to="/send" logMessage="Missing quote" />;
    }

    return <CreateCashuTokenConfirmation quote={quote} account={sendAccount} />;
  }

  return <Redirect to="/send" logMessage="Invalid send type" />;
}

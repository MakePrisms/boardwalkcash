import { Redirect } from '~/components/redirect';
import {
  CreateCashuTokenConfirmation,
  PayBolt11Confirmation,
} from '~/features/send';
import { useSendStore } from '~/features/send';

export default function SendConfirmationPage() {
  const {
    sendType,
    getSourceAccount,
    amount: sendAmount,
    destination,
    destinationValue,
    quote,
  } = useSendStore();
  const sendAccount = getSourceAccount();

  if (!sendAmount || !sendType || !sendAccount) {
    return <Redirect to="/send" logMessage="Missing send data" />;
  }

  if (sendAccount.type !== 'cashu') {
    return <Redirect to="/send" logMessage="Invalid sending account" />;
  }

  if (
    sendType === 'BOLT11_INVOICE' ||
    sendType === 'LN_ADDRESS' ||
    sendType === 'AGICASH_CONTACT'
  ) {
    if (!destination || !destinationValue || !quote) {
      return <Redirect to="/send" logMessage="Missing destination data" />;
    }

    return (
      <PayBolt11Confirmation
        account={sendAccount}
        quote={quote}
        destinationValue={destinationValue}
        destinationType={sendType}
        destination={destination}
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

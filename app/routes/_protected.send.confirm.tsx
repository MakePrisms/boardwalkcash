import { Redirect } from '~/components/redirect';
import {
  CreateCashuTokenConfirmation,
  PayBolt11Confirmation,
  PayCashuRequestConfirmation,
} from '~/features/send';
import { useSendStore } from '~/features/send';
import type { CashuLightningQuote } from '~/features/send/cashu-send-quote-service';
import type { CashuSwapQuote } from '~/features/send/cashu-send-swap-service';

export default function SendConfirmationPage() {
  const sendAccount = useSendStore((state) => state.getSourceAccount());
  const sendAmount = useSendStore((state) => state.amount);
  const sendType = useSendStore((state) => state.sendType);
  const destination = useSendStore((state) => state.destination);
  const destinationDisplay = useSendStore((state) => state.destinationDisplay);
  const quote = useSendStore((state) => state.quote);

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
    if (!destination || !destinationDisplay || !quote) {
      return <Redirect to="/send" logMessage="Missing destination data" />;
    }

    return (
      <PayBolt11Confirmation
        account={sendAccount}
        quote={quote as CashuLightningQuote}
        destination={destination}
        destinationDisplay={destinationDisplay}
      />
    );
  }

  if (sendType === 'CASHU_TOKEN') {
    if (!quote) {
      return <Redirect to="/send" logMessage="Missing quote" />;
    }

    return (
      <CreateCashuTokenConfirmation
        quote={quote as CashuSwapQuote}
        account={sendAccount}
      />
    );
  }

  return <Redirect to="/send" logMessage="Invalid send type" />;
}

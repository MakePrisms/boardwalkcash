import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { QRScanner } from '~/components/qr-scanner';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import { useNavigateWithViewTransition } from '~/lib/transitions/view-transition';
import type { Account } from '../accounts/account';
import { useSendStore } from './send-provider';

/**
 * Converts an amount to the send account currency.
 * If the amount is already in the send account currency, returns the amount.
 *
 * @throws if the exchange rate fails to load
 */
const useConverter = (sendAccount: Account) => {
  const otherCurrency = sendAccount.currency === 'BTC' ? 'USD' : 'BTC';

  const { data: rate } = useExchangeRate(
    `${otherCurrency}-${sendAccount.currency}`,
  );

  return (amount: Money) => {
    if (amount.currency === sendAccount.currency) return amount;
    if (!rate) throw new Error('Exchange rate not found');

    return amount.convert(sendAccount.currency, rate);
  };
};

export default function SendScanner() {
  const { toast } = useToast();
  const navigate = useNavigateWithViewTransition();

  const setPaymentRequest = useSendStore((state) => state.setPaymentRequest);
  const setSendAmount = useSendStore((state) => state.setAmount);
  const sendAccount = useSendStore((state) => state.account);

  const convert = useConverter(sendAccount);

  const handleDecode = (input: string) => {
    const result = setPaymentRequest(input);
    if (!result.valid) {
      const { error } = result;
      return toast({
        title: 'Invalid input',
        description: error,
        variant: 'destructive',
      });
    }

    const { amount } = result;

    if (!amount) {
      // we enforce bolt11s to have an amount, but cashu requests don't need an amount
      // if the setPaymentRequest validation passes, that means the user just needs
      // to enter an amount then click continue. In the future bolt11s can be amountless
      // in cashu and other account types can handle amountless bolt11s

      // QUESTION: what if the user already entered an amount then they clicked scan?
      // I think we should set inputValue to zero when the user clicks scan, then direct them back to the input page
      // to enter the amount.

      return navigate('/send', {
        applyTo: 'oldView',
        transition: 'slideDown',
      });
    }

    const sendAmount = convert(amount);
    setSendAmount(sendAmount);

    return navigate('/send/confirm', {
      applyTo: 'newView',
      transition: 'slideUp',
    });
  };

  return (
    <>
      <PageHeader className="z-10">
        <PageBackButton to="/send" transition="slideDown" applyTo="oldView" />
        <PageHeaderTitle>Scan</PageHeaderTitle>
      </PageHeader>
      <PageContent className="relative flex items-center justify-center">
        <QRScanner
          onDecode={(value) => {
            handleDecode(value);
          }}
        />
      </PageContent>
    </>
  );
}

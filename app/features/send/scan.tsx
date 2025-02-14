import { decodePaymentRequest } from '@cashu/cashu-ts';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { QRScanner } from '~/components/qr-scanner';
import { useToast } from '~/hooks/use-toast';
import { decodeBolt11, isBolt11Invoice } from '~/lib/bolt11';
import { isCashuPaymentRequest } from '~/lib/cashu';

export default function Scan() {
  const { toast } = useToast();

  const handleDecode = (input: string) => {
    if (isBolt11Invoice(input)) {
      const { network, amountSat } = decodeBolt11(input);
      if (network !== 'bitcoin') {
        return toast({
          title: 'Invalid invoice',
          description: `Unsupported network: ${network}. Only Bitcoin mainnet is supported`,
          variant: 'destructive',
        });
      }
      if (!amountSat) {
        return toast({
          title: 'Invalid invoice',
          description: 'Amount is required for Lightning invoices',
          variant: 'destructive',
        });
      }
    }

    if (isCashuPaymentRequest(input)) {
      const decoded = decodePaymentRequest(input);
      // TODO: navigate to send-input for user to enter amount
      if (!decoded.amount) {
        return toast({
          title: 'Amount is required',
          description: 'Enter an amount to send, then click "Continue"',
        });
      }
    }

    return toast({
      title: 'Invalid input',
      description:
        'You can only paste Lightning invoices and Cashu payment requests.',
      variant: 'destructive',
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

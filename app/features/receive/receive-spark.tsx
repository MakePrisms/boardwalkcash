import { Banknote, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { useCopyToClipboard, useTimeout } from 'usehooks-ts';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Carousel, CarouselContent } from '~/components/ui/carousel';
import type { Account } from '~/features/accounts/account';
import {
  CarouselControls,
  QRCarouselItem,
  useCarousel,
} from '~/features/shared/qr-code';
import { useToast } from '~/hooks/use-toast';
import type { Money } from '~/lib/money';
import { useNavigateWithViewTransition } from '~/lib/transitions';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import {
  useDetectPayment,
  useReceiveSpark,
  useSparkAddress,
} from './receive-spark-hooks';

type SparkAddressQRItemProps = {
  amount: Money<'BTC'>;
  isPaid: boolean;
};

/** Displays a QR code for the user's static public Spark address. */
export function SparkAddressQRItem({ isPaid }: SparkAddressQRItemProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  const { sparkAddress, isLoading } = useSparkAddress();

  return (
    <QRCarouselItem
      value={sparkAddress}
      description={
        isPaid ? 'Payment complete!' : 'Scan with any Spark compatible wallet.'
      }
      isLoading={isLoading}
      isPaid={isPaid}
      onClick={
        sparkAddress
          ? () => {
              copyToClipboard(sparkAddress);
              toast({
                title: 'Copied Spark Address',
                description: `${sparkAddress.slice(0, 5)}...${sparkAddress.slice(-5)}`,
              });
            }
          : undefined
      }
    />
  );
}

type SparkInvoiceQRItemProps = {
  account: Account;
  amount: Money<'BTC'>;
  memo: string;
  isVisible: boolean;
  isPaid: boolean;
};

export function SparkInvoiceQRItem({
  account,
  amount,
  memo,
  isVisible,
  isPaid,
}: SparkInvoiceQRItemProps) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();

  // We're still using the hook for creating invoices, but not for payment detection
  const { invoice, isLoading, fetchError, createInvoice } = useReceiveSpark({
    account,
    amount,
    memo,
    isVisible,
  });

  useEffect(() => {
    if (isVisible && !invoice) {
      createInvoice();
    }
  }, [isVisible, invoice, createInvoice]);

  const handleCopyInvoice = () => {
    if (invoice) {
      copyToClipboard(invoice);
      toast({
        title: 'Copied Lightning Invoice',
        description: `${invoice.slice(0, 5)}...${invoice.slice(-5)}`,
      });
    }
  };

  return (
    <QRCarouselItem
      value={invoice}
      description={
        isPaid ? 'Payment complete!' : 'Scan with any Lightning wallet.'
      }
      error={fetchError}
      isLoading={isLoading}
      isPaid={isPaid}
      onClick={handleCopyInvoice}
    />
  );
}

export const ReceiveSpark = ({
  amount,
  account,
}: { amount: Money<'BTC'>; account: Account }) => {
  const { current, scrollToIndex, setApi } = useCarousel();
  const navigate = useNavigateWithViewTransition();

  // Single payment detection for the whole page
  const { isPaid } = useDetectPayment(amount);

  // Navigate to home page after 5 seconds after payment is received
  useTimeout(
    () => {
      navigate('/', {
        transition: 'slideDown',
        applyTo: 'oldView',
      });
    },
    isPaid ? 5000 : null,
  );

  const carouselOptions = [
    {
      icon: <Banknote className="h-5 w-5" />,
      id: 'address',
      label: 'Bitcoin Address',
    },
    {
      icon: <Zap className="h-5 w-5" />,
      id: 'invoice',
      label: 'Lightning Invoice',
    },
  ];

  return (
    <>
      <PageHeader>
        <PageBackButton
          to="/receive"
          transition="slideDown"
          applyTo="oldView"
        />
        <PageHeaderTitle>Receive Ecash</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center overflow-x-hidden overflow-y-hidden">
        <MoneyWithConvertedAmount money={amount as Money} />
        <div className="flex w-full flex-col items-center justify-center px-8 py-8">
          <Carousel setApi={setApi} opts={{ align: 'center', loop: true }}>
            <CarouselContent>
              <SparkAddressQRItem amount={amount} isPaid={isPaid} />
              <SparkInvoiceQRItem
                account={account}
                amount={amount}
                memo="Test memo"
                isVisible={current === 1}
                isPaid={isPaid}
              />
            </CarouselContent>
          </Carousel>
          <CarouselControls
            current={current}
            onSelect={scrollToIndex}
            options={carouselOptions}
          />
        </div>
      </PageContent>
    </>
  );
};

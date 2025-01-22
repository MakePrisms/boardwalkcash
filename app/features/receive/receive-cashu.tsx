import {
  CashuMint,
  CashuWallet,
  type MintQuoteResponse,
  MintQuoteState,
} from '@cashu/cashu-ts';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';
import {
  PageBackButton,
  PageContent,
  PageHeaderTitle,
} from '~/components/page';
import { PageHeader } from '~/components/page';
import { Card, CardContent } from '~/components/ui/card';
import {
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '~/components/ui/carousel';
import { Carousel, CarouselContent } from '~/components/ui/carousel';
import type { Money } from '~/lib/money';
import type { Account } from '../accounts/account-selector';
import { LoadingScreen } from '../loading/LoadingScreen';
import { getCashuRequest } from './reusable-payment-request';

type Props = {
  amount: Money;
  account: Account & { type: 'cashu' };
};
export default function ReceiveCashu({ amount, account }: Props) {
  const cashuUnit = account.currency === 'USD' ? 'usd' : 'sat';
  const moneyUnit = cashuUnit === 'usd' ? 'cent' : 'sat';
  const wallet = new CashuWallet(new CashuMint(account.mintUrl), {
    unit: cashuUnit,
  });
  const mintQuoteRef = useRef<MintQuoteResponse | null>(null);

  const {
    isLoading: loadingMintQuote,
    isLoadingError: mintQuoteError,
    data: mintQuote,
  } = useQuery({
    queryKey: ['receive-cashu', account, amount],
    queryFn: async () => {
      console.log('createMintQuote', amount.toNumber(moneyUnit));
      const mintQuote = await wallet.createMintQuote(
        amount.toNumber(moneyUnit),
      );
      mintQuoteRef.current = mintQuote;
      return mintQuote;
    },
  });

  const { data: quoteStatus } = useQuery({
    queryKey: ['receive-cashu-status', mintQuote?.quote],
    queryFn: async () => {
      if (!mintQuoteRef.current?.quote) return null;
      const quoteStatus = await wallet.checkMintQuote(
        mintQuoteRef.current.quote,
      );
      mintQuoteRef.current.state = quoteStatus.state;
      return quoteStatus;
    },
    throwOnError: true,
    enabled:
      !!mintQuote && mintQuoteRef.current?.state === MintQuoteState.UNPAID,
    refetchInterval: 1500,
  });

  const cashuRequest = getCashuRequest(account, {
    amount: amount,
    unit: cashuUnit,
    singleUse: true,
  }).toEncodedRequest();

  const qrCodeValues = [cashuRequest, mintQuoteRef.current?.request];

  console.log('receiveCashu', { account, amount });
  console.log('mintQuote', mintQuoteRef.current);
  console.log('quoteStatus', quoteStatus);
  console.log('mintQuoteError', mintQuoteError);

  if (loadingMintQuote) {
    return <LoadingScreen />;
  }

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
      <PageContent>
        <Carousel
          opts={{ align: 'center', loop: true }}
          className=" max-w-sm sm:mx-auto "
        >
          <CarouselContent>
            {qrCodeValues.map((value) => (
              <CarouselItem key={value}>
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    {value ? (
                      <QRCodeSVG value={value} />
                    ) : (
                      <div>Loading...</div>
                    )}
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        {quoteStatus?.state === MintQuoteState.PAID && (
          <div className="text-3xl">
            <p>Paid!</p>
          </div>
        )}
      </PageContent>
    </>
  );
}

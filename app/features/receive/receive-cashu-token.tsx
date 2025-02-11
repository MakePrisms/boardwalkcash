import type { Token } from '@cashu/cashu-ts';
import { AlertCircle } from 'lucide-react';
import { MoneyDisplay } from '~/components/money-display';
import {
  Page,
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { getDefaultUnit } from '~/features/shared/currencies';
import { useExchangeRate } from '~/hooks/use-exchange-rate';
import { useToast } from '~/hooks/use-toast';
import { accounts } from '~/routes/_protected._index';
import { AccountSelector } from '../accounts/account-selector';
import { LoadingScreen } from '../loading/LoadingScreen';
import { useReceiveCashuToken } from './use-receive-cashu-token';

// biome-ignore lint/style/noNonNullAssertion: this variable is just a placeholder
const defaultAccount = accounts.find((a) => a.type === 'cashu')!;

type Props = {
  token: Token;
};

export default function ReceiveToken({ token }: Props) {
  const { toast } = useToast();
  const {
    data: tokenData,
    isClaiming,
    handleClaim,
    setReceiveAccount,
  } = useReceiveCashuToken({
    token,
    cashuPubKey:
      '038127ae202c95f4cd4ea8ba34e73618f578adf516db553a902a8589796bdc373',
  });

  const { data: rate, error: exchangeRateError } = useExchangeRate(
    `${tokenData?.money.currency}-${tokenData?.money.currency === 'BTC' ? 'USD' : 'BTC'}`,
  );

  if (!tokenData) {
    return <LoadingScreen />;
  }

  const {
    canClaim,
    receiveAccount,
    selectableAccounts,
    disableCrossMintSwap,
    selectedAccountIsSource,
    cannotClaimReason,
    money,
    shouldShowConvertedAmount,
    isMintKnown,
  } = tokenData;

  return (
    <Page>
      <PageHeader className="z-10">
        <PageBackButton
          to="/receive"
          transition="slideRight"
          applyTo="oldView"
        />
        <PageHeaderTitle>Receive</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center">
        <div>
          <div className="flex h-[124px] flex-col items-center gap-2">
            <MoneyDisplay money={money} unit={getDefaultUnit(money.currency)} />
            {shouldShowConvertedAmount && (
              <div className="flex flex-col items-center gap-2">
                {!exchangeRateError && rate && (
                  <MoneyDisplay
                    money={money.convert(
                      money.currency === 'BTC' ? 'USD' : 'BTC',
                      rate,
                    )}
                    unit={getDefaultUnit(
                      money.currency === 'BTC' ? 'USD' : 'BTC',
                    )}
                    variant="secondary"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
          {canClaim ? (
            <div className="w-full max-w-sm px-4">
              <AccountSelector
                accounts={selectableAccounts}
                selectedAccount={receiveAccount}
                disabled={disableCrossMintSwap}
                onSelect={(a) => {
                  if (a.type === 'cashu') {
                    setReceiveAccount(a);
                  } else {
                    toast({
                      title: 'Invalid account',
                      description: 'Please select a Cashu account',
                      variant: 'destructive',
                    });
                  }
                }}
              />
              {/* TODO: move these badges to the account selector */}
              <div className="mt-4 flex justify-end gap-2">
                {!isMintKnown && selectedAccountIsSource && (
                  <Badge variant="destructive" className="text-xs">
                    Unknown
                  </Badge>
                )}
                {selectedAccountIsSource && (
                  <Badge className="text-xs">Token Mint</Badge>
                )}
                {receiveAccount.id === defaultAccount.id && (
                  <Badge className="text-xs">Default Mint</Badge>
                )}
                {receiveAccount.isTestMint && selectedAccountIsSource && (
                  <Badge className="text-xs">Test Mint</Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4">
              <AlertCircle className="h-8 w-8 text-foreground" />
              <p className="text-center text-muted-foreground text-sm">
                {cannotClaimReason || 'This ecash cannot be claimed.'}
              </p>
            </div>
          )}
        </div>

        <div className="z-10 mt-auto">
          {canClaim && (
            <Button
              onClick={handleClaim}
              className="min-w-[200px]"
              loading={isClaiming}
            >
              {selectedAccountIsSource
                ? isMintKnown
                  ? 'Claim'
                  : 'Add Mint and Claim'
                : 'Claim'}
            </Button>
          )}
        </div>
      </PageContent>
    </Page>
  );
}

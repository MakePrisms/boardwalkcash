import type { Token } from '@cashu/cashu-ts';
import { AlertCircle } from 'lucide-react';
import {
  Page,
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { AccountSelector } from '../accounts/account-selector';
import { LoadingScreen } from '../loading/LoadingScreen';
import { tokenToMoney } from '../shared/cashu';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import { useReceiveCashuToken } from './use-receive-cashu-token';

type Props = {
  token: Token;
};

export default function ReceiveToken({ token }: Props) {
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

  if (!tokenData) {
    return <LoadingScreen />;
  }

  const {
    receiveAccount,
    selectableAccounts,
    crossMintSwapDisabled,
    receiveAccountIsSource,
    cannotClaimReason,
    isMintKnown,
    claimableToken,
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
        <MoneyWithConvertedAmount
          money={tokenToMoney(claimableToken ?? token)}
        />
        <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
          {claimableToken ? (
            <div className="w-full max-w-sm px-4">
              <AccountSelector
                accounts={selectableAccounts}
                selectedAccount={receiveAccount}
                disabled={crossMintSwapDisabled}
                onSelect={setReceiveAccount}
              />
            </div>
          ) : (
            <div className="mx-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4">
              <AlertCircle className="h-8 w-8 text-foreground" />
              <p className="text-center text-muted-foreground text-sm">
                {cannotClaimReason}
              </p>
            </div>
          )}
        </div>

        {claimableToken && (
          <div className="z-10 mt-auto">
            <Button
              onClick={handleClaim}
              className="min-w-[200px]"
              loading={isClaiming}
            >
              {receiveAccountIsSource
                ? isMintKnown
                  ? 'Claim'
                  : 'Add Mint and Claim'
                : 'Claim'}
            </Button>
          </div>
        )}
      </PageContent>
    </Page>
  );
}

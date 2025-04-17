import { type Token, getEncodedToken } from '@cashu/cashu-ts';
import { AlertCircle } from 'lucide-react';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { useToast } from '~/hooks/use-toast';
import type { CashuAccount } from '../accounts/account';
import { AccountSelector } from '../accounts/account-selector';
import { tokenToMoney } from '../shared/cashu';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import {
  useCashuTokenSourceAccount,
  useReceiveCashuToken,
  useReceiveCashuTokenAccounts,
  useTokenWithClaimableProofs,
} from './receive-cashu-token-hooks';
import { SuccessfulReceivePage } from './successful-receive-page';

type Props = {
  token: Token;
};

export default function ReceiveToken({ token }: Props) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  const { claimableToken, cannotClaimReason } = useTokenWithClaimableProofs({
    token,
    cashuPubKey: // TODO: replace with user's pubkey from OS
      '038127ae202c95f4cd4ea8ba34e73618f578adf516db553a902a8589796bdc373',
  });
  const sourceAccount = useCashuTokenSourceAccount(token);
  const {
    selectableAccounts,
    receiveAccount,
    isCrossMintSwapDisabled,
    setReceiveAccount,
    addAndSetReceiveAccount,
  } = useReceiveCashuTokenAccounts(sourceAccount);

  const isReceiveAccountAdded = receiveAccount.id !== '';

  const { status, claimToken } = useReceiveCashuToken({
    onError: (error) => {
      toast({
        title: 'Failed to claim token',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClaim = async () => {
    if (!claimableToken) {
      return;
    }

    let account: CashuAccount = receiveAccount;

    if (!isReceiveAccountAdded) {
      try {
        account = await addAndSetReceiveAccount(receiveAccount);
      } catch (error) {
        console.error(error);
        return toast({
          title: 'Failed to add account',
          description: 'Please try again',
        });
      }
    }

    await claimToken({ token, account });
  };

  if (status === 'SUCCESS') {
    return (
      <SuccessfulReceivePage
        amount={tokenToMoney(claimableToken ?? token)}
        account={receiveAccount}
      />
    );
  }

  return (
    <>
      <PageHeader className="z-10">
        <PageBackButton
          to="/receive"
          transition="slideRight"
          applyTo="oldView"
        />
        <PageHeaderTitle>Receive</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center">
        <button
          type="button"
          className="z-10 transition-transform active:scale-95"
          onClick={() => {
            copyToClipboard(getEncodedToken(claimableToken ?? token));
            toast({
              title: 'Token copied to clipboard',
            });
          }}
        >
          <MoneyWithConvertedAmount
            money={tokenToMoney(claimableToken ?? token)}
          />
        </button>

        <div className="absolute top-0 right-0 bottom-0 left-0 mx-auto flex max-w-sm items-center justify-center">
          {claimableToken ? (
            <div className="w-full max-w-sm px-4">
              <AccountSelector
                accounts={selectableAccounts}
                selectedAccount={receiveAccount}
                disabled={isCrossMintSwapDisabled}
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
          <div className="z-10 mt-auto mb-28">
            <Button
              onClick={handleClaim}
              className="min-w-[200px]"
              loading={status === 'CLAIMING'}
            >
              {isReceiveAccountAdded ? 'Claim' : 'Add Mint and Claim'}
            </Button>
          </div>
        )}
      </PageContent>
    </>
  );
}

import { type Token, getEncodedToken } from '@cashu/cashu-ts';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  Page,
  PageBackButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { useEffectNoStrictMode } from '~/hooks/use-effect-no-strict-mode';
import { useToast } from '~/hooks/use-toast';
import { LinkWithViewTransition } from '~/lib/transitions';
import { AccountSelector } from '../accounts/account-selector';
import { tokenToMoney } from '../shared/cashu';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import { useAuthActions } from '../user/auth';
import {
  useSetDefaultAccount,
  useSetDefaultCurrency,
} from '../user/user-hooks';
import {
  useReceiveCashuToken,
  useReceiveCashuTokenAccounts,
  useTokenWithClaimableProofs,
} from './receive-cashu-token-hooks';
import { SuccessfulReceivePage } from './successful-receive-page';

type Props = {
  token: Token;
  /**
   * Determines whether the token should be claimed automatically.
   */
  autoClaim: boolean;
};

/**
 * Shared component for displaying the token amount with copy functionality
 */
function TokenAmountDisplay({
  token,
  claimableToken,
}: { token: Token; claimableToken: Token | null }) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();

  return (
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
      <MoneyWithConvertedAmount money={tokenToMoney(claimableToken ?? token)} />
    </button>
  );
}

/**
 * Shared component for displaying error when token cannot be claimed
 */
function TokenErrorDisplay({
  cannotClaimReason,
}: { cannotClaimReason: string }) {
  return (
    <div className="mx-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4">
      <AlertCircle className="h-8 w-8 text-foreground" />
      <p className="text-center text-muted-foreground text-sm">
        {cannotClaimReason}
      </p>
    </div>
  );
}

export default function ReceiveToken({ token, autoClaim }: Props) {
  const { claimableToken, cannotClaimReason } = useTokenWithClaimableProofs({
    token,
    cashuPubKey: // TODO: replace with user's pubkey from OS
      '038127ae202c95f4cd4ea8ba34e73618f578adf516db553a902a8589796bdc373',
  });
  const {
    selectableAccounts,
    receiveAccount,
    isCrossMintSwapDisabled,
    sourceAccount,
    setReceiveAccount,
    addAndSetReceiveAccount,
  } = useReceiveCashuTokenAccounts(token);

  const setDefaultAccount = useSetDefaultAccount();
  const setDefaultCurrency = useSetDefaultCurrency();

  const isReceiveAccountAdded = receiveAccount.id !== '';

  const { status, claimToken } = useReceiveCashuToken({
    onError: (error) => {
      const { toast } = useToast();
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

    let account = receiveAccount;

    if (!isReceiveAccountAdded) {
      try {
        account = await addAndSetReceiveAccount(receiveAccount);
      } catch (error) {
        console.error(error);
        const { toast } = useToast();
        return toast({
          title: 'Failed to add account',
          description: 'Please try again',
        });
      }
    }

    await claimToken({ token: claimableToken, account });
  };

  useEffectNoStrictMode(() => {
    if (!claimableToken) return;

    const handleAutoClaim = async () => {
      const isReceiveAccountAdded = receiveAccount.id !== '';

      // TODO: remove this. I think we need it because we are waiting for supabase realtime updates to be ready.
      // If we claim too fast, then we never make it to the successful receive page.
      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        const account = isReceiveAccountAdded
          ? receiveAccount
          : await addAndSetReceiveAccount(sourceAccount);

        await setDefaultAccount(account);
        await setDefaultCurrency(account.currency);

        // TODO: remove redirected=1 from URL before claiming. I just want to make sure general approach is right before
        await claimToken({ token: claimableToken, account });
      } catch (error) {
        console.error(error);
        const { toast } = useToast();
        toast({
          title: 'Failed to auto claim token',
        });
      }
    };

    if (autoClaim) {
      handleAutoClaim();
    }
  }, [
    autoClaim,
    claimableToken,
    addAndSetReceiveAccount,
    sourceAccount,
    claimToken,
  ]);

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
        <TokenAmountDisplay token={token} claimableToken={claimableToken} />

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
            <TokenErrorDisplay cannotClaimReason={cannotClaimReason} />
          )}
        </div>

        {claimableToken && (
          <div className="z-10 mt-auto mb-28">
            <Button
              disabled={receiveAccount.selectable === false}
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

export function PublicReceiveCashuToken({ token }: { token: Token }) {
  const navigate = useNavigate();
  const { claimableToken, cannotClaimReason } = useTokenWithClaimableProofs({
    token,
  });
  const { signUpGuest } = useAuthActions();
  const [signingUpGuest, setSigningUpGuest] = useState(false);

  const encodedToken = getEncodedToken(claimableToken ?? token);

  const handleClaim = async () => {
    if (!claimableToken) {
      return;
    }

    setSigningUpGuest(true);

    await signUpGuest().then(() => {
      navigate(
        `/receive/cashu-token?redirected=1#${encodeURIComponent(encodedToken)}`,
      );
    });

    setSigningUpGuest(false);
  };

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
        <TokenAmountDisplay token={token} claimableToken={claimableToken} />

        {!claimableToken && (
          <div className="absolute top-0 right-0 bottom-0 left-0 mx-auto flex max-w-sm items-center justify-center">
            <TokenErrorDisplay cannotClaimReason={cannotClaimReason} />
          </div>
        )}

        {claimableToken && (
          <div className="z-10 mt-auto mb-28 flex flex-col gap-4">
            <Button
              onClick={handleClaim}
              className="min-w-[200px]"
              loading={signingUpGuest}
            >
              Claim as Guest
            </Button>

            <LinkWithViewTransition
              to={`/login#${encodeURIComponent(encodedToken)}`}
              className="min-w-[200px]"
              transition="slideUp"
              applyTo="newView"
            >
              <Button className="min-w-[200px] ">Log In and Claim</Button>
            </LinkWithViewTransition>
          </div>
        )}
      </PageContent>
    </Page>
  );
}

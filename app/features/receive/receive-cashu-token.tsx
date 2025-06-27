import { type Token, getEncodedToken } from '@cashu/cashu-ts';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  ClosePageButton,
  PageBackButton,
  PageContent,
  PageFooter,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { useEffectNoStrictMode } from '~/hooks/use-effect-no-strict-mode';
import { useToast } from '~/hooks/use-toast';
import { LinkWithViewTransition } from '~/lib/transitions';
import { useDefaultAccount } from '../accounts/account-hooks';
import { AccountSelector } from '../accounts/account-selector';
import { tokenToMoney } from '../shared/cashu';
import { getErrorMessage } from '../shared/error';
import { MoneyWithConvertedAmount } from '../shared/money-with-converted-amount';
import { useAuthActions } from '../user/auth';
import {
  useSetDefaultAccount,
  useSetDefaultCurrency,
} from '../user/user-hooks';
import {
  useReceiveCashuToken,
  useReceiveCashuTokenAccounts,
  useTokenSourceAccountQuery,
  useTokenWithClaimableProofs,
} from './receive-cashu-token-hooks';
import { SuccessfulReceivePage } from './successful-receive-page';

type Props = {
  token: Token;
  autoClaimToken: boolean;
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
          duration: 1000,
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

export default function ReceiveToken({ token, autoClaimToken }: Props) {
  const { toast } = useToast();
  const defaultAccount = useDefaultAccount();
  const setDefaultAccount = useSetDefaultAccount();
  const setDefaultCurrency = useSetDefaultCurrency();
  const { claimableToken, cannotClaimReason } = useTokenWithClaimableProofs({
    token,
  });
  const {
    selectableAccounts,
    receiveAccount,
    isCrossMintSwapDisabled,
    sourceAccount,
    setReceiveAccount,
    addAndSetReceiveAccount,
  } = useReceiveCashuTokenAccounts(token);

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

  const { mutate: claimTokenMutation } = useMutation({
    mutationFn: async ({
      token,
      isAutoClaim,
    }: {
      token: Token;
      isAutoClaim: boolean;
    }) => {
      const isReceiveAccountAdded = receiveAccount.id !== '';

      let account = receiveAccount;
      if (!isReceiveAccountAdded) {
        // For auto claim, prefer source account if selectable, otherwise use receive account
        // For manual claim, always use receive account
        const accountToAdd =
          isAutoClaim && sourceAccount?.selectable
            ? sourceAccount
            : receiveAccount;
        account = await addAndSetReceiveAccount(accountToAdd);
      }

      await claimToken({ token, account });

      return { account, isAutoClaim };
    },
    onSuccess: async ({ account, isAutoClaim }) => {
      // Only set defaults for auto claim and if the account is different from current default
      if (isAutoClaim && account.id !== defaultAccount.id) {
        try {
          await setDefaultAccount(account);
          await setDefaultCurrency(account.currency);
        } catch (error) {
          console.error('Error setting defaults after auto claim', {
            cause: error,
          });
        }
      }
    },
    onError: (error) => {
      console.error('Error claiming token', { cause: error });
      toast({
        title: 'Failed to claim token',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const handleClaim = async () => {
    if (!claimableToken) {
      return;
    }

    claimTokenMutation({ token: claimableToken, isAutoClaim: false });
  };

  useEffectNoStrictMode(() => {
    if (!claimableToken || !autoClaimToken) return;

    claimTokenMutation({ token: claimableToken, isAutoClaim: true });
  }, [autoClaimToken, claimableToken, claimTokenMutation]);

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
      </PageContent>

      {claimableToken && (
        <PageFooter className="pb-14">
          <Button
            disabled={receiveAccount.selectable === false}
            onClick={handleClaim}
            className="w-[200px]"
            loading={status === 'CLAIMING'}
          >
            {isReceiveAccountAdded ? 'Claim' : 'Add Mint and Claim'}
          </Button>
        </PageFooter>
      )}
    </>
  );
}

export function PublicReceiveCashuToken({ token }: { token: Token }) {
  const [signingUpGuest, setSigningUpGuest] = useState(false);
  const { signUpGuest } = useAuthActions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    data: { sourceAccount },
  } = useTokenSourceAccountQuery(token);
  const { claimableToken, cannotClaimReason } = useTokenWithClaimableProofs({
    token,
  });

  const encodedToken = getEncodedToken(claimableToken ?? token);

  const handleClaimAsGuest = async () => {
    if (!claimableToken) {
      return;
    }

    setSigningUpGuest(true);
    try {
      await signUpGuest();
      // Navigate to the same page with autoClaim flag
      navigate({ hash: encodedToken, search: 'autoClaim=true' });
    } catch (error) {
      console.error('Error signing up guest', { cause: error });
      toast({
        title: 'Failed to create guest account',
        description: 'Please try again or contact support',
        variant: 'destructive',
      });
    } finally {
      setSigningUpGuest(false);
    }
  };

  return (
    <>
      <PageHeader className="z-10">
        <ClosePageButton
          to="/signup"
          transition="slideDown"
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
                accounts={[]}
                selectedAccount={sourceAccount}
                disabled={true}
              />
            </div>
          ) : (
            <TokenErrorDisplay cannotClaimReason={cannotClaimReason} />
          )}
        </div>
      </PageContent>

      {claimableToken && (
        <PageFooter className="pb-14">
          <div className="flex flex-col gap-4">
            <Button
              onClick={handleClaimAsGuest}
              className="w-[200px]"
              loading={signingUpGuest}
            >
              Claim as Guest
            </Button>

            <LinkWithViewTransition
              to={`/login?redirectTo=receive-cashu-token#${encodedToken}`}
              transition="slideUp"
              applyTo="newView"
            >
              <Button className="w-[200px]">Log In and Claim</Button>
            </LinkWithViewTransition>
          </div>
        </PageFooter>
      )}
    </>
  );
}

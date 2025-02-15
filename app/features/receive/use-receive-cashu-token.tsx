import { CashuMint, CashuWallet, type Token } from '@cashu/cashu-ts';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { CashuAccount } from '~/features/accounts/account';
import { useAccounts, useAddAccounts } from '~/features/accounts/use-accounts';
import { tokenToMoney } from '~/features/shared/cashu';
import { useToast } from '~/hooks/use-toast';
import {
  getP2PKPubkeyFromProofs,
  getUnspentProofsFromToken,
  isP2PKSecret,
  isPlainSecret,
  swapProofsToWallet,
} from '~/lib/cashu';
import { isTestMint as checkIsTestMint, getMintInfo } from '~/lib/cashu';
import type { MintInfo } from '~/lib/cashu';
import type { Money } from '~/lib/money';
import { useNavigateWithViewTransition } from '~/lib/transitions';
import { getDefaultUnit } from '../shared/currencies';

type UseReceiveCashuTokenProps = {
  token: Token;
  cashuPubKey: string;
};

type UseReceiveCashuTokenData = {
  /** The token with only claimable proofs or the full token if it cannot be claimed */
  displayToken: Token;
  /** Whether the token can be claimed (fully or partially) by this user */
  canClaim: boolean;
  /** The account to receive the token */
  receiveAccount: CashuAccount;
  /** The account that the token is from */
  sourceAccount: CashuAccount;
  /** True if the source account cannot make a lightning payment to other accounts */
  disableCrossMintSwap: boolean;
  /** Whether the selected account is the source mint */
  selectedAccountIsSource: boolean;
  /** The reason why the user cannot claim the token */
  cannotClaimReason: string | undefined;
  /** The accounts that the user can select to receive the token */
  selectableAccounts: CashuAccount[];
  /** The token as Money object */
  money: Money;
  /**
   * Whether the token's mint is in the user's accounts. Will be undefined
   * if the user is not initialized (ie. they clicked a token link but do not have an account)
   */
  isMintKnown: boolean | undefined;
};

type UseReceiveCashuTokenReturn = {
  /** The data fetched by the query function. Will be undefined while isLoading is true */
  data: UseReceiveCashuTokenData | undefined;
  isLoading: boolean;
  isClaiming: boolean;
  /** Set the account to receive the token */
  setReceiveAccount: (account: CashuAccount) => void;
  /** Claim the token to the selected account */
  handleClaim: () => Promise<void>;
};

const tokenToSourceAccount = (
  token: Token,
  mintInfo?: MintInfo,
  isTestMint?: boolean,
): CashuAccount => ({
  type: 'cashu',
  mintUrl: token.mint,
  id: 'source',
  createdAt: new Date().toISOString(),
  name: mintInfo?.name ?? 'Unknown Mint',
  currency: tokenToMoney(token).currency,
  isTestMint: isTestMint ?? false,
});

const getClaimableProofs = (
  unspentProofs: Token['proofs'],
  cashuPubKey: string,
) => {
  let cannotClaimReason: string | undefined;
  const claimableProofs = unspentProofs.filter((proof) => {
    if (isPlainSecret(proof.secret)) {
      return true;
    }
    if (!isP2PKSecret(proof.secret)) {
      cannotClaimReason = 'This ecash contains an unknown spending condition.';
      return false;
    }
    try {
      const pubkey = getP2PKPubkeyFromProofs([proof]);
      return pubkey === null || pubkey === cashuPubKey;
    } catch {
      console.warn('Failed to get pubkey from proof', proof);
      return false;
    }
  });

  return { claimableProofs, cannotClaimReason };
};

const getSelectableAccounts = (
  sourceAccount: CashuAccount,
  disableCrossMintSwap: boolean,
  accounts: CashuAccount[],
) => {
  return disableCrossMintSwap
    ? [sourceAccount]
    : [sourceAccount, ...accounts.filter((account) => !account.isTestMint)];
};

const getDefaultReceiveAccount = (
  selectableAccounts: CashuAccount[],
  sourceAccount: CashuAccount,
  disableCrossMintSwap: boolean,
  defaultAccount: CashuAccount,
) => {
  return (
    selectableAccounts.find(
      (a) =>
        a.mintUrl ===
        (disableCrossMintSwap ? sourceAccount.mintUrl : defaultAccount.mintUrl),
    ) ?? sourceAccount
  );
};

export function useReceiveCashuToken({
  token,
  cashuPubKey,
}: UseReceiveCashuTokenProps): UseReceiveCashuTokenReturn {
  const [isClaiming, setIsClaiming] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigateWithViewTransition();
  const [selectedReceiveAccount, setSelectedReceiveAccount] = useState<
    CashuAccount | undefined
  >();
  const { data: allAccounts } = useAccounts();
  const accounts = allAccounts?.filter(
    (a) => a.type === 'cashu',
  ) as CashuAccount[];
  const addAccount = useAddAccounts();
  const { data: sourceAccountData, isLoading: isSourceAccountLoading } =
    useQuery({
      queryKey: ['mint-info', token.mint],
      queryFn: async () => {
        const existingAccount = accounts.find((a) => a.mintUrl === token.mint);
        if (existingAccount) {
          return existingAccount;
        }

        const info = await getMintInfo(token.mint);
        const isTestMint = await checkIsTestMint(token.mint);
        return tokenToSourceAccount(token, info, isTestMint);
      },
    });

  const { data: tokenData, isLoading: isTokenDataLoading } = useQuery({
    queryKey: ['token-state', token, sourceAccountData],
    enabled: !!sourceAccountData,
    queryFn: async () => {
      if (!sourceAccountData) {
        return undefined;
      }

      const unspentProofs = await getUnspentProofsFromToken(token);
      const { claimableProofs, cannotClaimReason: initialReason } =
        getClaimableProofs(unspentProofs, cashuPubKey);

      let cannotClaimReason = initialReason;
      const isSpent = unspentProofs.length === 0;
      if (isSpent) {
        cannotClaimReason = 'This ecash has already been spent';
      } else if (claimableProofs.length === 0) {
        cannotClaimReason = 'You do not have permission to claim this ecash';
      }

      const canClaim = claimableProofs.length > 0;
      const displayToken: Token = canClaim
        ? { ...token, proofs: claimableProofs }
        : token;
      const money = tokenToMoney(displayToken);
      const isMintKnown = accounts.some(
        (a) => a.type === 'cashu' && a.mintUrl === token.mint,
      );
      const disableCrossMintSwap = sourceAccountData.isTestMint;

      const selectableAccounts = getSelectableAccounts(
        sourceAccountData,
        disableCrossMintSwap,
        accounts,
      );
      const defaultReceiveAccount = getDefaultReceiveAccount(
        selectableAccounts,
        sourceAccountData,
        disableCrossMintSwap,
        accounts[0],
      );
      const currentReceiveAccount =
        selectedReceiveAccount ?? defaultReceiveAccount;

      return {
        displayToken,
        canClaim,
        receiveAccount: currentReceiveAccount,
        sourceAccount: sourceAccountData,
        disableCrossMintSwap,
        selectedAccountIsSource:
          currentReceiveAccount.mintUrl === sourceAccountData.mintUrl,
        cannotClaimReason,
        selectableAccounts,
        money,
        isMintKnown,
      };
    },
  });

  const handleClaim = async () => {
    if (!tokenData?.receiveAccount) return;

    if (tokenData.selectedAccountIsSource && !tokenData.isMintKnown) {
      addAccount([
        {
          mintUrl: tokenData.sourceAccount.mintUrl,
          isTestMint: tokenData.sourceAccount.isTestMint,
          currency: tokenData.sourceAccount.currency,
          name: tokenData.sourceAccount.name,
          type: 'cashu',
        },
      ]);
    }

    const claimFrom = new CashuWallet(new CashuMint(token.mint));
    const claimTo = new CashuWallet(
      new CashuMint(tokenData.receiveAccount.mintUrl),
    );

    try {
      setIsClaiming(true);
      const { newProofs, change } = await swapProofsToWallet(
        claimFrom,
        claimTo,
        tokenData.displayToken.proofs,
        {
          proofsWeHave: [], // add to get the optimal proof amounts
          privkey: undefined, // add to unlock the proofs
          pubkey: undefined, // add to lock the new proofs
          counter: undefined, // add for deterministic secrets
        },
      );

      console.log('SUCCESS!', newProofs, change);
      // TODO: store the proofs
      // QUESTION: what to do with the change? We get change when the fees don't quite match up and we cannot
      // melt all the proofs. Options: burn the change, store it under the source mint.

      toast({
        title: 'Success!',
        description: `Claimed ${tokenData.money.toLocaleString({
          unit: getDefaultUnit(tokenData.money.currency),
        })} to ${tokenData.receiveAccount.name}`,
      });
      navigate('/', { transition: 'slideDown', applyTo: 'oldView' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Failed to claim',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const data = tokenData && {
    ...tokenData,
    receiveAccount: selectedReceiveAccount ?? tokenData.receiveAccount,
  };

  return {
    data,
    isLoading: isSourceAccountLoading || isTokenDataLoading,
    isClaiming,
    setReceiveAccount: setSelectedReceiveAccount,
    handleClaim,
  };
}

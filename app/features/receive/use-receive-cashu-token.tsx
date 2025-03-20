import {
  CashuMint,
  CashuWallet,
  type Proof,
  type Token,
} from '@cashu/cashu-ts';
import { useSuspenseQueries } from '@tanstack/react-query';
import { useState } from 'react';
import type { Account, CashuAccount } from '~/features/accounts/account';
import {
  useAccounts,
  useAddCashuAccount,
  useDefaultAccount,
} from '~/features/accounts/account-hooks';
import { tokenToMoney } from '~/features/shared/cashu';
import { useToast } from '~/hooks/use-toast';
import {
  getP2PKPubkeyFromProofs,
  getUnspentProofsFromToken,
  isP2PKSecret,
  isPlainSecret,
  swapProofsToWallet,
} from '~/lib/cashu';
import { checkIsTestMint, getMintInfo } from '~/lib/cashu';
import type { MintInfo } from '~/lib/cashu';
import { useNavigateWithViewTransition } from '~/lib/transitions';
import type { AccountWithBadges } from '../accounts/account-selector';
import { getDefaultUnit } from '../shared/currencies';

type CashuAccountWithBadges = AccountWithBadges<CashuAccount>;

type UseReceiveCashuTokenProps = {
  token: Token;
  cashuPubKey: string;
};

type TokenQueryResult =
  | {
      /** The token with only claimable proofs. Will be null if the token cannot be claimed */
      claimableToken: null;
      /** The reason why the token cannot be claimed. Will always be defined when claimableToken is null */
      cannotClaimReason: string;
    }
  | {
      claimableToken: Token;
      cannotClaimReason: null;
    };

type UseReceiveCashuTokenData = {
  /** The account to receive the token */
  receiveAccount: CashuAccountWithBadges;
  /** The account that the token is from */
  sourceAccount: CashuAccount;
  /** True if the source account cannot make a lightning payment to other accounts */
  crossMintSwapDisabled: boolean;
  /** Whether the selected receive account is the source mint */
  receiveAccountIsSource: boolean;
  /** The accounts that the user can select to receive the token */
  selectableAccounts: CashuAccountWithBadges[];
  /** Whether the token's mint is in the user's accounts */
  isMintKnown: boolean;
} & TokenQueryResult;

type UseReceiveCashuTokenReturn = {
  /** Data about the token and the accounts available to receive it */
  data: UseReceiveCashuTokenData;
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
  id: '',
  createdAt: new Date().toISOString(),
  name: mintInfo?.name ?? 'Unknown Mint',
  currency: tokenToMoney(token).currency,
  isTestMint: isTestMint ?? false,
  version: 0,
  keysetCounters: {},
  proofs: [],
});

const getClaimableProofs = (unspentProofs: Proof[], cashuPubKey: string) => {
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
  if (claimableProofs.length === 0) {
    return {
      claimableProofs: null,
      cannotClaimReason:
        cannotClaimReason ?? 'You do not have permission to claim this ecash',
    };
  }
  return { claimableProofs, cannotClaimReason: null };
};

const getSelectableAccounts = (
  sourceAccount: CashuAccount,
  disableCrossMintSwap: boolean,
  accounts: CashuAccount[],
) => {
  return disableCrossMintSwap
    ? [sourceAccount]
    : [
        sourceAccount,
        ...accounts.filter(
          (account) =>
            !account.isTestMint && account.mintUrl !== sourceAccount.mintUrl,
        ),
      ];
};

/**
 * Get the default account to receive the token.
 * If the source account is a test mint, then the source account will be returned.
 * Otherwise it will return the user's default account if it is a cashu account.
 * Otherwise it will return the source account.
 * @param selectableAccounts - Accounts available for receiving
 * @param sourceAccount - Account the token is from
 * @param disableCrossMintSwap - Whether we can swap to other mints
 * @param defaultAccount - The user's default account
 * @returns The default account to receive the token
 */
const getDefaultReceiveAccount = (
  selectableAccounts: CashuAccount[],
  sourceAccount: CashuAccount,
  disableCrossMintSwap: boolean,
  defaultAccount: Account,
): CashuAccount => {
  const targetMintUrl = disableCrossMintSwap
    ? sourceAccount.mintUrl
    : defaultAccount.type === 'cashu'
      ? defaultAccount.mintUrl
      : null;

  const matchingAccount = selectableAccounts.find(
    (account) =>
      account.mintUrl === targetMintUrl &&
      account.currency === defaultAccount.currency,
  );

  // Fall back to source account if no match found
  return matchingAccount ?? sourceAccount;
};

const getBadges = (
  account: CashuAccount,
  allAccounts: CashuAccount[],
  sourceAccount: CashuAccount,
  defaultAccount: Account,
) => {
  const badges: string[] = [];

  if (sourceAccount.isTestMint) {
    badges.push('Test Mint');
  }
  if (account.mintUrl === sourceAccount.mintUrl) {
    badges.push('Source');
  }
  if (
    defaultAccount.type === 'cashu' &&
    account.mintUrl === defaultAccount.mintUrl &&
    account.currency === defaultAccount.currency
  ) {
    badges.push('Default');
  }
  if (!allAccounts.some((a) => a.mintUrl === account.mintUrl)) {
    badges.push('Unknown');
  }

  return badges;
};

/**
 * Hook to receive a cashu token.
 * @param token - The token to receive
 * @param cashuPubKey - The user's cashu public key
 * @returns Token data fetched by the query function and functions to claim the token.
 * Data is undefined while isLoading is true.
 */
export function useReceiveCashuToken({
  token,
  cashuPubKey,
}: UseReceiveCashuTokenProps): UseReceiveCashuTokenReturn {
  const [isClaiming, setIsClaiming] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigateWithViewTransition();
  const [selectedReceiveAccount, setSelectedReceiveAccount] = useState<
    CashuAccountWithBadges | undefined
  >();
  const { data: allAccounts } = useAccounts();
  const accounts: CashuAccount[] = allAccounts.filter(
    (a) => a.type === 'cashu',
  );
  const addAccount = useAddCashuAccount();
  const defaultAccount = useDefaultAccount();
  const tokenCurrency = tokenToMoney(token).currency;

  const { tokenData, sourceAccountData } = useSuspenseQueries({
    queries: [
      {
        queryKey: ['mint-info', token.mint, tokenCurrency],
        queryFn: async () => {
          const existingAccount = accounts.find(
            (a) => a.mintUrl === token.mint && a.currency === tokenCurrency,
          );
          if (existingAccount) {
            return existingAccount;
          }
          const info = await getMintInfo(token.mint);
          const isTestMint = await checkIsTestMint(token.mint);
          return tokenToSourceAccount(token, info, isTestMint);
        },
        retry: 1,
        retryDelay: 5000,
      },
      {
        queryKey: ['token-state', token],
        queryFn: async (): Promise<TokenQueryResult> => {
          const unspentProofs = await getUnspentProofsFromToken(token);
          if (unspentProofs.length === 0) {
            return {
              claimableToken: null,
              cannotClaimReason: 'This ecash has already been spent',
            };
          }

          const { claimableProofs, cannotClaimReason } = getClaimableProofs(
            unspentProofs,
            cashuPubKey,
          );

          return claimableProofs
            ? {
                claimableToken: { ...token, proofs: claimableProofs },
                cannotClaimReason,
              }
            : { cannotClaimReason, claimableToken: null };
        },
        retry: 1,
        retryDelay: 5000,
      },
    ],
    combine: (results) => {
      return {
        sourceAccountData: results[0].data,
        tokenData: results[1].data,
      };
    },
  });

  const handleClaim = async () => {
    const {
      claimableToken,
      receiveAccount,
      receiveAccountIsSource,
      isMintKnown,
    } = data;

    if (!claimableToken) {
      throw new Error('Token cannot be claimed');
    }
    setIsClaiming(true);

    const claimFrom = new CashuWallet(new CashuMint(token.mint));
    const claimTo = new CashuWallet(new CashuMint(receiveAccount.mintUrl));

    try {
      if (receiveAccountIsSource && !isMintKnown) {
        await addAccount({
          ...sourceAccountData,
          type: 'cashu',
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Failed to add account',
        description: 'Please try again',
      });
      setIsClaiming(false);
      return;
    }

    try {
      const { newProofs, change } = await swapProofsToWallet(
        claimFrom,
        claimTo,
        claimableToken.proofs,
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

      const value = tokenToMoney(claimableToken);
      toast({
        title: 'Success!',
        description: `Claimed ${value.toLocaleString({
          unit: getDefaultUnit(value.currency),
        })} to ${receiveAccount.name}`,
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

  const crossMintSwapDisabled = sourceAccountData.isTestMint;
  const selectableAccounts = getSelectableAccounts(
    sourceAccountData,
    crossMintSwapDisabled,
    accounts,
  );
  const accountWithBadges = selectableAccounts.map((a) => ({
    ...a,
    badges: getBadges(a, accounts, sourceAccountData, defaultAccount),
  }));
  const defaultReceiveAccount = getDefaultReceiveAccount(
    accountWithBadges,
    sourceAccountData,
    crossMintSwapDisabled,
    defaultAccount,
  );
  const currentReceiveAccount = selectedReceiveAccount ?? defaultReceiveAccount;
  const isMintKnown = accounts.some((a) => a.mintUrl === token.mint);
  const data = {
    ...tokenData,
    sourceAccount: sourceAccountData,
    crossMintSwapDisabled,
    receiveAccountIsSource:
      currentReceiveAccount.mintUrl === sourceAccountData.mintUrl,
    selectableAccounts: accountWithBadges,
    isMintKnown,
    receiveAccount: selectedReceiveAccount ?? currentReceiveAccount,
  };

  return {
    data,
    isClaiming,
    setReceiveAccount: setSelectedReceiveAccount,
    handleClaim,
  };
}

import type { Token } from '@cashu/cashu-ts';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type {
  Account,
  CashuAccount,
  ExtendedCashuAccount,
} from '~/features/accounts/account';
import {
  useAccount,
  useAccounts,
  useAddCashuAccount,
  useDefaultAccount,
} from '~/features/accounts/account-hooks';
import { tokenToMoney } from '~/features/shared/cashu';
import { getClaimableProofs, getUnspentProofsFromToken } from '~/lib/cashu';
import { checkIsTestMint, getMintInfo } from '~/lib/cashu';
import { useLatest } from '~/lib/use-latest';
import type { AccountWithBadges } from '../accounts/account-selector';
import {
  useCreateCashuTokenSwap,
  useTokenSwap,
} from './cashu-token-swap-hooks';

type CashuAccountWithBadges = AccountWithBadges<CashuAccount>;

type UseGetClaimableTokenProps = {
  token: Token;
  cashuPubKey: string;
};

type TokenQueryResult =
  | {
      /** The token with only claimable proofs. Will be null if the token cannot be claimed */
      claimableToken: Token;
      /** The reason why the token cannot be claimed. Will never be defined when claimableToken is not null. */
      cannotClaimReason: never;
    }
  | {
      claimableToken: null;
      cannotClaimReason: string;
    };

/**
 * Takes a token and returns the account that the token is from.
 * If the account does not exist, we construct and return an account, but we do not store it in the database.
 */
export function useCashuTokenSourceAccount(token: Token) {
  const tokenCurrency = tokenToMoney(token).currency;
  const { data: allAccounts } = useAccounts({ type: 'cashu' });
  const existingAccount = allAccounts.find(
    (a) => a.mintUrl === token.mint && a.currency === tokenCurrency,
  );

  const { data } = useSuspenseQuery({
    queryKey: ['token-source-account', token.mint, tokenCurrency],
    queryFn: async (): Promise<ExtendedCashuAccount> => {
      if (existingAccount) {
        return existingAccount;
      }
      const info = await getMintInfo(token.mint);
      const isTestMint = await checkIsTestMint(token.mint);
      return {
        id: '',
        type: 'cashu',
        mintUrl: token.mint,
        createdAt: new Date().toISOString(),
        name: info?.name ?? token.mint.replace('https://', ''),
        currency: tokenToMoney(token).currency,
        isTestMint: isTestMint,
        version: 0,
        keysetCounters: {},
        proofs: [],
        isDefault: false,
      };
    },
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  return data;
}

/**
 * This hook is used to check which proofs in a token are already spent and which
 * proofs have spending conditions that this user can satisfy.
 * @param token - The token to receive
 * @param cashuPubKey - The public key that the the user can provide signatures for
 * @returns A token with only proofs that can be claimed. If the token cannot be claimed,
 * the hook will return a reason why and a null token.
 */
export function useTokenWithClaimableProofs({
  token,
  cashuPubKey,
}: UseGetClaimableTokenProps) {
  const { data: tokenData } = useSuspenseQuery({
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
        [cashuPubKey],
      );

      return claimableProofs
        ? {
            claimableToken: { ...token, proofs: claimableProofs },
            cannotClaimReason: undefined as never,
          }
        : { cannotClaimReason, claimableToken: null };
    },
    retry: 1,
  });

  return tokenData;
}

const getDefaultReceiveAccount = (
  selectableAccounts: CashuAccount[],
  sourceAccount: CashuAccount,
  isCrossMintSwapDisabled: boolean,
  defaultAccount: Account,
): CashuAccount => {
  const targetAccount =
    isCrossMintSwapDisabled || defaultAccount.type !== 'cashu'
      ? sourceAccount
      : defaultAccount;

  const matchingAccount = selectableAccounts.find(
    (a) => a.id === targetAccount.id,
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
  if (defaultAccount.type === 'cashu' && account.id === defaultAccount.id) {
    badges.push('Default');
  }
  if (!allAccounts.some((a) => a.mintUrl === account.mintUrl)) {
    badges.push('Unknown');
  }

  return badges;
};

const getSelectableAccounts = (
  sourceAccount: CashuAccount,
  isCrossMintSwapDisabled: boolean,
  accounts: CashuAccount[],
  defaultAccount: Account,
): CashuAccountWithBadges[] => {
  const baseAccounts = isCrossMintSwapDisabled
    ? [sourceAccount]
    : [
        sourceAccount,
        ...accounts.filter(
          (account) =>
            !account.isTestMint && account.mintUrl !== sourceAccount.mintUrl,
        ),
      ];

  return baseAccounts.map((account) => ({
    ...account,
    badges: getBadges(account, accounts, sourceAccount, defaultAccount),
  }));
};

/**
 * Lets the user select an account to receive the token and returns data about the
 * selectable accounts based on the source account and the user's accounts in the database.
 */
export function useReceiveCashuTokenAccounts(
  sourceAccount: ExtendedCashuAccount,
) {
  const { data: accounts } = useAccounts({ type: 'cashu' });
  const addCashuAccount = useAddCashuAccount();
  const defaultAccount = useDefaultAccount();

  const isCrossMintSwapDisabled = sourceAccount.isTestMint;
  const selectableAccounts = getSelectableAccounts(
    sourceAccount,
    isCrossMintSwapDisabled,
    accounts,
    defaultAccount,
  );
  const defaultReceiveAccount = getDefaultReceiveAccount(
    selectableAccounts,
    sourceAccount,
    isCrossMintSwapDisabled,
    defaultAccount,
  );

  const [receiveAccountId, setReceiveAccountId] = useState<string>(
    defaultReceiveAccount.id,
  );
  const receiveAccount = useAccount<ExtendedCashuAccount>(
    receiveAccountId,
    () => sourceAccount,
  );

  const setReceiveAccount = (account: CashuAccountWithBadges) => {
    const isSelectable = selectableAccounts.some((a) => a.id === account.id);
    if (!isSelectable) {
      throw new Error('Account is not selectable');
    }

    setReceiveAccountId(account.id);
  };

  const addAndSetReceiveAccount = async (
    accountToAdd: CashuAccount,
  ): Promise<CashuAccount> => {
    const newAccount = await addCashuAccount(accountToAdd);
    setReceiveAccountId(newAccount.id);
    return newAccount;
  };

  return {
    selectableAccounts,
    receiveAccount,
    isCrossMintSwapDisabled,
    setReceiveAccount,
    addAndSetReceiveAccount,
  };
}

type ClaimStatus = 'IDLE' | 'CLAIMING' | 'SUCCESS' | 'ERROR';

type UseReceiveCashuTokenProps = {
  onError?: (error: Error) => void;
};

export function useReceiveCashuToken({
  onError,
}: UseReceiveCashuTokenProps = {}) {
  const onErrorRef = useLatest(onError);

  const {
    mutateAsync: createSwap,
    data: swapData,
    status: createSwapStatus,
  } = useCreateCashuTokenSwap();
  const { status: swapStatus } = useTokenSwap({
    tokenHash: swapData?.tokenHash,
    onFailed: () => onErrorRef.current?.(new Error('Failed to swap token')),
  });

  const claimToken = async ({
    token,
    account,
  }: {
    token: Token;
    account: CashuAccount;
  }) => {
    try {
      const isSourceMint = account.mintUrl === token.mint;

      if (isSourceMint) {
        await createSwap({ token, account });
      } else {
        // TODO: implement cross mint swap
        throw new Error('Claiming to other account types not implemented');
      }
    } catch (error) {
      console.error('Failed to claim token', error);

      onErrorRef.current?.(
        error instanceof Error ? error : new Error('An unknown error occurred'),
      );
    }
  };

  const status: ClaimStatus = (() => {
    if (createSwapStatus === 'pending' || swapStatus === 'PENDING') {
      return 'CLAIMING';
    }
    if (swapStatus === 'COMPLETED') {
      return 'SUCCESS';
    }
    if (createSwapStatus === 'error' || swapStatus === 'FAILED') {
      return 'ERROR';
    }
    return 'IDLE';
  })();

  return {
    status,
    claimToken,
  };
}

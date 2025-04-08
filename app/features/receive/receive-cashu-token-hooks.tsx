import type { Proof, Token } from '@cashu/cashu-ts';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type {
  Account,
  CashuAccount,
  ExtendedCashuAccount,
} from '~/features/accounts/account';
import {
  useAccount,
  useAccounts,
  useDefaultAccount,
} from '~/features/accounts/account-hooks';
import { tokenToMoney } from '~/features/shared/cashu';
import {
  getP2PKPubkeyFromProofs,
  getUnspentProofsFromToken,
  isP2PKSecret,
  isPlainSecret,
} from '~/lib/cashu';
import { checkIsTestMint, getMintInfo } from '~/lib/cashu';
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
      claimableToken: null;
      /** The reason why the token cannot be claimed. Will always be defined when claimableToken is null */
      cannotClaimReason: string;
    }
  | {
      claimableToken: Token;
      cannotClaimReason: null;
    };

/**
 * Takes a token and returns the account that the token is from.
 * If the account does not exist, we construct and return an account, but we do not store it in the database.
 */
export function useGetCashuTokenSourceAccount(token: Token) {
  const tokenCurrency = tokenToMoney(token).currency;
  const { data: allAccounts } = useAccounts();
  const accounts: CashuAccount[] = allAccounts.filter(
    (a) => a.type === 'cashu',
  );
  const existingAccount = accounts.find(
    (a) => a.mintUrl === token.mint && a.currency === tokenCurrency,
  );
  if (existingAccount) {
    return existingAccount;
  }

  const { data } = useSuspenseQuery({
    queryKey: ['token-source-account', token.mint, tokenCurrency],
    queryFn: async (): Promise<CashuAccount> => {
      const info = await getMintInfo(token.mint);
      const isTestMint = await checkIsTestMint(token.mint);
      return {
        id: '',
        type: 'cashu',
        mintUrl: token.mint,
        createdAt: new Date().toISOString(),
        name: info?.name ?? 'Unknown Mint',
        currency: tokenToMoney(token).currency,
        isTestMint: isTestMint ?? false,
        version: 0,
        keysetCounters: {},
        proofs: [],
      };
    },
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  return data;
}

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

/**
 * This hook is used to check which proofs in a token are already spent and which
 * proofs have spending conditions that this user can satisfy.
 * @param token - The token to receive
 * @param cashuPubKey - The public key that the the user can provide signatures for
 * @returns A token with only proofs that can be claimed. If the token cannot be claimed,
 * the hook will return a reason why and a null token.
 */
export function useGetClaimableToken({
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
        cashuPubKey,
      );

      return claimableProofs
        ? {
            claimableToken: { ...token, proofs: claimableProofs },
            cannotClaimReason: null,
          }
        : { cannotClaimReason, claimableToken: null };
    },
    retry: 1,
  });

  return tokenData;
}

function isSameAccount(a: CashuAccount, b: CashuAccount) {
  return a.mintUrl === b.mintUrl && a.currency === b.currency;
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

  const matchingAccount = selectableAccounts.find((account) =>
    isSameAccount(account, targetAccount),
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
    isSameAccount(account, defaultAccount)
  ) {
    badges.push('Default');
  }
  if (!allAccounts.some((a) => a.mintUrl === account.mintUrl)) {
    badges.push('Unknown');
  }

  return badges;
};

/**
 * Returns a list of accounts that the user can select to receive the token.
 * If cross mint swaps are disabled because we can't make a lightning payment
 * from the source account, we only show the source account. Otherwise, we show
 * the source account and all other non-testnet cashu accounts.
 */
const getSelectableAccounts = (
  sourceAccount: CashuAccount,
  isCrossMintSwapDisabled: boolean,
  accounts: CashuAccount[],
) => {
  return isCrossMintSwapDisabled
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
 * Lets the user select an account to receive the token and returns data about the
 * selectable accounts based on the source account and the user's accounts in the database.
 */
export function useReceiveCashuTokenAccounts(sourceAccount: CashuAccount) {
  const { data: allAccounts } = useAccounts();
  const defaultAccount = useDefaultAccount();
  const accounts: CashuAccount[] = allAccounts.filter(
    (a) => a.type === 'cashu',
  );
  const isCrossMintSwapDisabled = sourceAccount.isTestMint;
  const selectableAccounts = getSelectableAccounts(
    sourceAccount,
    isCrossMintSwapDisabled,
    accounts,
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
  const receiveAccount = useAccount<ExtendedCashuAccount>(receiveAccountId);

  const accountWithBadges = selectableAccounts.map((a) => ({
    ...a,
    badges: getBadges(a, accounts, sourceAccount, defaultAccount),
  }));

  const isSourceAccountAdded = accounts.some((a) =>
    isSameAccount(a, sourceAccount),
  );

  const setReceiveAccount = (account: CashuAccountWithBadges) => {
    const isSelectable = selectableAccounts.some((a) =>
      isSameAccount(a, account),
    );
    if (!isSelectable) {
      throw new Error('Account is not selectable');
    }

    setReceiveAccountId(account.id);
  };

  return {
    selectableAccounts: accountWithBadges,
    receiveAccount,
    receiveAccountIsSource: receiveAccount.mintUrl === sourceAccount.mintUrl,
    isSourceAccountAdded,
    isCrossMintSwapDisabled,
    setReceiveAccount,
  };
}

type ClaimDestination = 'source' | 'other' | null;

type UseReceiveCashuTokenProps = {
  onError?: (error: Error) => void;
};

export function useReceiveCashuToken({
  onError,
}: UseReceiveCashuTokenProps = {}) {
  const onErrorRef = useRef(onError);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeClaimDestination, setActiveClaimDestination] =
    useState<ClaimDestination>(null);

  const { mutateAsync: createSwap, data: swapData } = useCreateCashuTokenSwap();
  const { status: swapStatus } = useTokenSwap({
    tokenHash: swapData?.tokenHash,
    onFailed: () => onErrorRef.current?.(new Error('Failed to swap token')),
    onCompleted: () => setIsSuccess(true),
  });

  const claimTokenToAcount = async ({
    token,
    account,
  }: {
    token: Token;
    account: CashuAccount;
  }) => {
    try {
      const isSourceMint = account.mintUrl === token.mint;

      if (isSourceMint) {
        setActiveClaimDestination('source');
        await createSwap({ token, account });
      } else {
        setActiveClaimDestination('other');
        // TODO: implement cross mint swap
        throw new Error('Claiming to other account types not implemented');
      }
    } catch (error) {
      console.error('Failed to claim token', error);
      setActiveClaimDestination(null);

      onErrorRef.current?.(
        error instanceof Error ? error : new Error('An unknown error occurred'),
      );
    }
  };

  // Determine if claiming is in progress based on the active destination
  const isClaiming = (() => {
    if (activeClaimDestination === 'source') {
      return ['PENDING', 'LOADING'].includes(swapStatus);
    }
    if (activeClaimDestination === 'other') {
      // TODO: Return loading state for cross mint method
      return true;
    }
    return false;
  })();

  return {
    isClaiming,
    isSuccess,
    claimTokenToAcount,
  };
}

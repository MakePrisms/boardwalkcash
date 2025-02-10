import { CashuMint, CashuWallet, type Token } from '@cashu/cashu-ts';
import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import { useState } from 'react';
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
import { useNavigateWithViewTransition } from '~/lib/transitions';
import { accounts as allAccounts } from '~/routes/_protected._index';
import type { Account } from '../accounts/account-selector';
import { getDefaultUnit } from '../shared/currencies';
const defaultFiatCurrency = 'USD';

type CashuAccount = Account & { type: 'cashu' };

type UseReceiveCashuTokenProps = {
  token: Token;
  cashuPubKey: string;
};

type UseReceiveCashuTokenReturn = {
  /** The token as Money object */
  money: ReturnType<typeof tokenToMoney>;
  /** Whether to show the converted amount (BTC<->USD) */
  shouldShowConvertedAmount: boolean;
  /** The token with only claimable proofs */
  displayToken: Token;
  /** Whether the token can be claimed by this user */
  canClaim: boolean;
  /** Whether the token's mint is known to the user */
  isMintKnown: boolean | undefined;
  /** The account to receive the token */
  receiveAccount: CashuAccount;
  /** Whether cross-mint swaps are disabled */
  disableCrossMintSwap: boolean;
  /** Whether the selected account is the source mint */
  selectedAccountIsSource: boolean;
  /** The reason why the user cannot claim the token */
  cannotClaimReason: string | undefined;
  /** Whether the token is from a test mint */
  fromTestMint: boolean;
  /** The accounts that the user can select to receive the token */
  selectableAccounts: CashuAccount[];
  /** Function to set the receive account */
  setReceiveAccount: (account: CashuAccount) => void;
  isLoading: boolean;
  isClaiming: boolean;
  handleClaim: () => Promise<void>;
};

const accounts = allAccounts.filter(
  (a) => a.type === 'cashu',
) as CashuAccount[];
const defaultAccount = accounts[0];

export function useReceiveCashuToken({
  token,
  cashuPubKey,
}: UseReceiveCashuTokenProps): UseReceiveCashuTokenReturn {
  const [isClaiming, setIsClaiming] = useState(false);
  const [receiveAccount, setReceiveAccount] =
    useState<CashuAccount>(defaultAccount);
  const { toast } = useToast();
  const navigate = useNavigateWithViewTransition();

  const { data: proofData, isLoading: isUnspentProofsLoading } = useQuery({
    queryKey: ['token-state', token],
    queryFn: async () => {
      const unspentProofs = await getUnspentProofsFromToken(token);
      const claimableProofs = unspentProofs.filter((proof) => {
        if (isPlainSecret(proof.secret)) {
          return true;
        }
        if (!isP2PKSecret(proof.secret)) {
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
      return { isSpent: unspentProofs.length === 0, claimableProofs };
    },
  });

  const { data: mintInfo, isLoading: isMintInfoLoading } = useQuery({
    queryKey: ['mint-info', token.mint],
    queryFn: async () => {
      const info = await getMintInfo(token.mint);
      const isTestMint = await checkIsTestMint(token.mint);
      return { info, isTestMint };
    },
  });

  const isLoading = isUnspentProofsLoading || isMintInfoLoading;
  const claimableProofs = proofData?.claimableProofs ?? [];
  const canClaim = claimableProofs.length > 0;

  // If we have any claimable proofs, show only those.
  // Otherwise show the full token but mark it as unclaimable
  const displayToken: Token = canClaim
    ? { ...token, proofs: claimableProofs }
    : token;

  const money = tokenToMoney(displayToken);

  const shouldShowConvertedAmount =
    money.currency === 'BTC' || money.currency !== defaultFiatCurrency;

  // should be undefined if the user is not initialized (ie. clicked a token link, but not logged in)
  // a known mint is a mint that the user has added to their accounts
  const isMintKnown: boolean | undefined = accounts.some(
    (a) => a.type === 'cashu' && a.mintUrl === token.mint,
  );

  const sourceAccount: CashuAccount = accounts.find(
    (a) => a.mintUrl === token.mint,
  ) ?? {
    type: 'cashu',
    mintUrl: token.mint,
    id: 'source',
    name: mintInfo?.info.name ?? 'Unknown Mint',
    currency: money.currency,
    balance: Big(0),
  };

  const disableCrossMintSwap = mintInfo?.isTestMint ?? false;
  const selectedAccountIsSource =
    receiveAccount.mintUrl === sourceAccount.mintUrl;
  const effectiveReceiveAccount = disableCrossMintSwap
    ? sourceAccount
    : receiveAccount;

  const handleClaim = async () => {
    const claimFrom = new CashuWallet(new CashuMint(token.mint));
    const claimTo = new CashuWallet(
      new CashuMint(effectiveReceiveAccount.mintUrl),
    );

    try {
      setIsClaiming(true);
      const { newProofs, change } = await swapProofsToWallet(
        claimFrom,
        claimTo,
        claimableProofs,
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
        description: `Claimed ${money.toLocaleString({
          unit: getDefaultUnit(money.currency),
        })} to ${effectiveReceiveAccount.name}`,
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

  const cannotClaimReason = proofData?.isSpent
    ? 'This ecash has already been spent'
    : 'You do not have permission to claim this ecash';

  const selectableAccounts = (() => {
    // If cross mint swaps are disabled, only allow source account
    if (disableCrossMintSwap) {
      return [sourceAccount];
    }

    // If mint is not known, add source account to list of accounts
    if (!isMintKnown) {
      return [sourceAccount, ...accounts];
    }

    return accounts;
  })();

  return {
    money,
    canClaim,
    isLoading,
    isClaiming,
    isMintKnown,
    displayToken,
    cannotClaimReason,
    selectableAccounts,
    disableCrossMintSwap,
    selectedAccountIsSource,
    shouldShowConvertedAmount,
    receiveAccount: effectiveReceiveAccount,
    fromTestMint: mintInfo?.isTestMint ?? false,
    setReceiveAccount,
    handleClaim,
  };
}

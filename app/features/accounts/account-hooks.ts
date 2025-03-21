import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import type { DistributedOmit } from 'type-fest';
import { checkIsTestMint, getKeysets } from '~/lib/cashu';
import type { Currency } from '~/lib/money';
import { boardwalkDb } from '../boardwalk-db/database';
import { useCashuCryptography } from '../shared/cashu';
import type { User } from '../user/user';
import { useUser } from '../user/user-hooks';
import type { Account, CashuAccount } from './account';
import { AccountRepository } from './account-repository';

export const accountsQueryKey = 'accounts';

function isDefaultAccount(user: User, account: Account) {
  if (account.currency === 'BTC') {
    return user.defaultBtcAccountId === account.id;
  }
  if (account.currency === 'USD') {
    return user.defaultUsdAccountId === account.id;
  }
  return false;
}

export function useAccounts(currency?: Currency) {
  const cryptography = useCashuCryptography();
  const userId = useUser((x) => x.id);
  const accountRepository = new AccountRepository(boardwalkDb, cryptography);
  const response = useSuspenseQuery({
    queryKey: [accountsQueryKey, userId],
    queryFn: () => accountRepository.getAll(userId),
  });

  if (!currency) {
    return response;
  }

  return {
    ...response,
    data: response.data.filter((x) => x.currency === currency),
  };
}

export function useAccount(id: string) {
  const { data: accounts } = useAccounts();
  const account = accounts.find((x) => x.id === id);
  if (!account) {
    throw new Error(`Account with id ${id} not found`);
  }

  const user = useUser();

  return { ...account, isDefault: isDefaultAccount(user, account) };
}

export function useDefaultAccount() {
  const defaultCurrency = useUser((x) => x.defaultCurrency);
  const { data: accounts } = useAccounts(defaultCurrency);

  const defaultBtcAccountId = useUser((x) => x.defaultBtcAccountId);
  const defaultUsdccountId = useUser((x) => x.defaultUsdAccountId);

  const defaultAccount = accounts.find(
    (x) =>
      (x.currency === 'BTC' && x.id === defaultBtcAccountId) ||
      (x.currency === 'USD' && x.id === defaultUsdccountId),
  );

  if (!defaultAccount) {
    throw new Error(`No default account found for currency ${defaultCurrency}`);
  }

  return defaultAccount;
}

export function useAddCashuAccount() {
  const queryClient = useQueryClient();
  const userId = useUser((x) => x.id);
  const cryptography = useCashuCryptography();
  const accountRepository = new AccountRepository(boardwalkDb, cryptography);

  const { mutateAsync } = useMutation({
    mutationFn: async (
      account: DistributedOmit<
        CashuAccount,
        | 'id'
        | 'createdAt'
        | 'isTestMint'
        | 'keysetCounters'
        | 'proofs'
        | 'version'
      >,
    ) => {
      const isTestMintPromise = checkIsTestMint(account.mintUrl);
      const keysetsPromise = getKeysets(
        account.mintUrl,
        account.currency === 'USD' ? 'cent' : 'sat', // TODO: check if this is correct
      );
      const [isTestMint, keysets] = await Promise.all([
        isTestMintPromise,
        keysetsPromise,
      ]);

      // TODO: see if mint can change keysets over time and if it can where would we detect new keysets and update the keysetCounters
      const keysetCounters = keysets.reduce(
        (acc, keyset) => {
          acc[keyset.id] = 0;
          return acc;
        },
        {} as Record<string, number>,
      );

      return accountRepository.create({
        ...account,
        userId,
        isTestMint,
        keysetCounters,
        proofs: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [accountsQueryKey, userId],
      });
    },
  });

  return mutateAsync;
}

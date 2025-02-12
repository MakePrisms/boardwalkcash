import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import type { DistributedOmit } from 'type-fest';
import { boardwalkDb } from '../boardwalk-db/database';
import { useUserStore } from '../user/user-provider';
import { AccountRepository } from './account-repository';

const accountRepository = new AccountRepository(boardwalkDb);

const queryKey = 'accounts';

export function useAccounts() {
  const userId = useUserStore((x) => x.user.id);
  return useSuspenseQuery({
    queryKey: [queryKey, userId],
    queryFn: () => accountRepository.getAll(userId),
  });
}

type AccountInput = Parameters<AccountRepository['create']>[0][number];

export function useAddAccounts() {
  const userId = useUserStore((x) => x.user.id);
  const queryClient = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: (accounts: DistributedOmit<AccountInput, 'userId'>[]) =>
      accountRepository.create(
        accounts.map((account) => ({ ...account, userId })),
      ),
    scope: {
      id: 'add-accounts',
    },
    onSuccess: (newAccounts) => {
      queryClient.setQueryData([queryKey, userId], newAccounts);
    },
    throwOnError: true,
  });

  return mutate;
}

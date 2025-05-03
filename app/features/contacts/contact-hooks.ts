import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useUserRef } from '../user/user-hooks';
import type { Contact } from './contact';
import { useContactRepository } from './contact-repository';

const contactsQueryKey = 'contacts';

export class ContactsCache {
  constructor(
    private readonly queryClient: QueryClient,
    private readonly userId: string,
  ) {}

  /**
   * Adds a contact to the cache.
   * @param contact - The contact to add.
   */
  add(contact: Contact) {
    this.queryClient.setQueryData<Contact[]>(
      [contactsQueryKey, this.userId],
      (curr) => [...(curr ?? []), contact],
    );
  }

  /**
   * Gets all contacts in the cache for the current user.
   * @returns The list of contacts.
   */
  getAll() {
    return this.queryClient.getQueryData<Contact[]>([
      contactsQueryKey,
      this.userId,
    ]);
  }

  /**
   * Get a contact by id.
   * @param id - The id of the contact.
   * @returns The contact or null if the contact is not found.
   */
  get(id: string) {
    const contacts = this.getAll();
    return contacts?.find((x) => x.id === id) ?? null;
  }

  /**
   * Removes a contact from the cache.
   * @param contactId - The id of the contact to remove.
   */
  remove(contactId: string) {
    this.queryClient.setQueryData<Contact[]>(
      [contactsQueryKey, this.userId],
      (curr) => curr?.filter((x) => x.id !== contactId) ?? [],
    );
  }
}

export function useContactsCache() {
  const queryClient = useQueryClient();
  const userRef = useUserRef();
  return useMemo(
    () => new ContactsCache(queryClient, userRef.current.id),
    [queryClient],
  );
}

type UseContactsOptions = {
  filterFn?: (contact: Contact) => boolean;
  pageSize?: number;
  initialData?: Contact[];
};

/**
 * Hook for listing contacts for the current user with pagination and optional filtering
 */
export function useContacts(options?: UseContactsOptions) {
  const userRef = useUserRef();
  const contactRepository = useContactRepository();
  const { filterFn, pageSize = 20 } = options || {};

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: [contactsQueryKey, userRef.current.id, pageSize],
      queryFn: async ({ pageParam = 0 }) => {
        const result = await contactRepository.getAll(userRef.current.id, {
          page: pageParam,
          pageSize,
        });

        if (filterFn) {
          result.data = result.data.filter(filterFn);
        }

        return result;
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, _, lastPageParam) => {
        return lastPage.hasMore ? lastPageParam + 1 : undefined;
      },
      staleTime: 3 * 1000,
    });

  // Flatten all pages into a single contacts array
  // TODO: Check if we maintian all past pages too
  const contacts = data?.pages.flatMap((page) => page.data) || [];

  return {
    contacts,
    fetchNextPage,
    hasNextPage,
    isLoading: status === 'pending',
    isFetchingNextPage,
  };
}

export function useContact(contactId: string) {
  const contactRepository = useContactRepository();
  const { contacts: cachedContacts } = useContacts({
    filterFn: (contact) => contact.id === contactId,
  });

  const cachedContact = cachedContacts[0] ?? null;

  // If not found in cache, fetch it directly
  const { data: fetchedContact, isLoading } = useQuery({
    queryKey: [contactsQueryKey, 'single', contactId],
    queryFn: () => contactRepository.get(contactId),
    // Only run this query if the contact isn't in the cache
    enabled: !cachedContact,
  });

  const contact = cachedContact || fetchedContact;

  // If contact isn't available and we're still loading, throw an error
  if (!contact && !isLoading) {
    throw new Error('Contact not found');
  }

  // If we're loading, throw a promise to suspend
  if (!contact && isLoading) {
    throw new Promise(() => {
      /* This will suspend until data is available */
    });
  }

  return contact;
}

export function useCreateContact() {
  const userRef = useUserRef();
  const contactsCache = useContactsCache();
  const contactRepository = useContactRepository();

  const { mutateAsync: createContact } = useMutation({
    mutationKey: ['create-contact', userRef.current.id],
    mutationFn: ({ username }: { username: string }) =>
      contactRepository.create({
        ownerId: userRef.current.id,
        username,
      }),
    onSuccess: (newContact) => {
      contactsCache.add(newContact);
    },
  });

  return createContact;
}

export function useDeleteContact() {
  const userRef = useUserRef();
  const contactsCache = useContactsCache();
  const contactRepository = useContactRepository();

  const { mutateAsync: deleteContact } = useMutation({
    mutationKey: ['delete-contact', userRef.current.id],
    mutationFn: (contactId: string) => contactRepository.delete(contactId),
    onSuccess: (_, contactId) => {
      contactsCache.remove(contactId);
    },
  });

  return deleteContact;
}

/**
 * @param query - The search query string
 * @return the query response containing any user profiles that match the query
 */
export function useSearchUserProfiles(query: string) {
  const contactRepository = useContactRepository();
  const userRef = useUserRef();

  return useQuery({
    queryKey: ['search-user-profiles', query],
    queryFn: async ({ queryKey }) => {
      const [, search] = queryKey;
      return contactRepository.searchUserProfiles(search, userRef.current.id);
    },
    initialData: [],
    staleTime: 1000 * 5,
  });
}

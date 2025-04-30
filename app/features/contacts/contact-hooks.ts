import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { PublicUser } from '../user/user';
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

/**
 * Hook for listing all contacts for the current user
 */
export function useContacts() {
  const userRef = useUserRef();
  const contactRepository = useContactRepository();
  const { data: contacts } = useSuspenseQuery({
    queryKey: [contactsQueryKey, userRef.current.id],
    queryFn: () => contactRepository.getAll(userRef.current.id),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return contacts;
}

export function useContact(contactId: string) {
  const contacts = useContacts();
  const contact = contacts.find((contact) => contact.id === contactId);
  if (!contact) {
    throw new Error('Contact not found');
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
    mutationFn: (contactId: string) =>
      contactRepository.delete(contactId, userRef.current.id),
    onSuccess: (_, contactId) => {
      contactsCache.remove(contactId);
    },
  });

  return deleteContact;
}

/**
 * Hook for searching users by partial username
 * @returns The list of public user data that matches the partial username, and a setter for the search query
 *
 * This hook maintains previous search results while a new search is loading,
 * providing a smoother user experience during searches. When the search query
 * changes, it will fetch new results while returning the previous results until
 * the new search completes.
 */
export function useSearchUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [previousResults, setPreviousResults] = useState<PublicUser[]>([]);
  const contactRepository = useContactRepository();

  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: async ({ queryKey }) => {
      const [, search] = queryKey;
      if (!search.trim()) return [];
      const newResults = await contactRepository.searchUsers(search);
      setPreviousResults(newResults);
      return newResults;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  return {
    results: isLoading ? previousResults : results,
    error,
    setSearchQuery,
  };
}

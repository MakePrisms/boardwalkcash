import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { boardwalkDb } from '../boardwalk-db/database';
import { useAuthState } from '../user/auth';
import { useUser } from '../user/user-hooks';
import type { Contact, CreateContact } from './contact';
import { ContactRepository } from './contact-repository';

const contactRepository = new ContactRepository(boardwalkDb);

const contactsQueryKey = 'contacts';
const searchUsersQueryKey = 'search-users';

/**
 * Hook for searching users by username
 */
// QUESTION: should this go to the user-hooks instead?
export function useSearchUsers({
  partialUsername,
}: { partialUsername: string }) {
  const [previousResults, setPreviousResults] = useState<
    { username: string }[] | null
  >(null);

  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [searchUsersQueryKey, partialUsername],
    queryFn: async ({ queryKey }) => {
      const [, searchQuery] = queryKey;
      if (!searchQuery.trim()) return null;
      const newResults = await contactRepository.searchUsers(searchQuery);
      setPreviousResults(newResults);
      return newResults;
    },
    staleTime: 1000 * 60 * 5, // Cache results for 5 minutes
  });

  return {
    results: isLoading ? previousResults : results,
    isLoading,
    error,
  };
}

/**
 * Hook for listing all contacts for the current user
 */
export function useContacts() {
  const { user } = useAuthState();

  if (!user) {
    throw new Error('Cannot use useContacts hook in anonymous context');
  }

  const { data: contacts, error } = useSuspenseQuery({
    queryKey: [contactsQueryKey, user.id],
    queryFn: () => contactRepository.list(user.id),
  });

  return {
    contacts,
    error,
  };
}

/**
 * Hook for getting a single contact by username
 */
export function useContact(contactId: string) {
  const { contacts } = useContacts();
  const contactData = contacts.find((contact) => contact.id === contactId);

  if (!contactData) {
    throw new Error('Contact not found');
  }

  const { data: contact, error } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const userData = await contactRepository.searchUsers(
        contactData.username,
      );

      if (!contactData || !userData?.[0]) {
        return null;
      }

      return {
        ...contactData,
        userMetadata: userData[0],
      };
    },
  });

  return {
    contact,
    error,
  };
}

/**
 * Hook for adding a new contact
 */
export function useAddContact() {
  const { user } = useAuthState();
  const queryClient = useQueryClient();

  if (!user) {
    throw new Error('Cannot use useAddContact hook in anonymous context');
  }

  //  TODO: return mutateAsync directly
  return useMutation({
    mutationKey: ['contact-create'],
    mutationFn: (contact: CreateContact) =>
      contactRepository.create(user.id, contact),
    onSuccess: (newContact) => {
      queryClient.setQueryData<Contact[]>(
        [contactsQueryKey, user.id],
        (old) => [newContact, ...(old ?? [])],
      );
    },
  });
}

/**
 * Hook for deleting a contact
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();
  const userId = useUser((u) => u.id);

  //  TODO: return mutateAsync directly
  return useMutation({
    mutationKey: ['contact-delete'],
    mutationFn: (contactId: string) =>
      contactRepository.delete(contactId, userId),
    onSuccess: (_, contactId) => {
      queryClient.setQueryData<Contact[]>(
        [contactsQueryKey, userId],
        (old) => old?.filter((contact) => contact.id !== contactId) ?? [],
      );
    },
  });
}

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useLatest } from '~/lib/use-latest';
import type { BoardwalkDbContact } from '../boardwalk-db/database';
import { boardwalkDb } from '../boardwalk-db/database';
import { useUserRef } from '../user/user-hooks';
import type { Contact } from './contact';
import { ContactRepository, useContactRepository } from './contact-repository';

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
 * Hook for listing contacts for the current user with optional filtering
 */
export function useContacts(select?: (contacts: Contact[]) => Contact[]) {
  const userRef = useUserRef();
  const contactRepository = useContactRepository();
  const contactsCache = useContactsCache();

  const { data: contacts } = useSuspenseQuery({
    queryKey: [contactsQueryKey, userRef.current.id],
    queryFn: async () => contactRepository.getAll(userRef.current.id),
    staleTime: Number.POSITIVE_INFINITY,
    select,
  });

  useOnContactsChange({
    onCreated: (contact) => contactsCache.add(contact),
    onDeleted: (contactId) => contactsCache.remove(contactId),
  });

  return contacts;
}

export function useContact(contactId: string) {
  const contacts = useContacts();
  const contact = contacts.find((contact) => contact.id === contactId);
  if (!contact) {
    return null;
  }
  return contact;
}

export function useCreateContact() {
  const userRef = useUserRef();
  const contactRepository = useContactRepository();

  const { mutateAsync: createContact } = useMutation({
    mutationKey: ['create-contact', userRef.current.id],
    mutationFn: ({ username }: { username: string }) =>
      contactRepository.create({
        ownerId: userRef.current.id,
        username,
      }),
  });

  return createContact;
}

export function useDeleteContact() {
  const userRef = useUserRef();
  const contactRepository = useContactRepository();

  const { mutateAsync: deleteContact } = useMutation({
    mutationKey: ['delete-contact', userRef.current.id],
    mutationFn: (contactId: string) => contactRepository.delete(contactId),
  });

  return deleteContact;
}

/**
 * @param query - The search query string
 * @return the query response containing any user profiles that match the query
 */
export function useFindContactCandidates(query: string) {
  const contactRepository = useContactRepository();
  const userRef = useUserRef();

  return useQuery({
    queryKey: ['search-user-profiles', query],
    queryFn: async ({ queryKey }) => {
      const [, search] = queryKey;
      return contactRepository.findContactCandidates(
        search,
        userRef.current.id,
      );
    },
    initialData: [],
    staleTime: 1000 * 5,
  });
}

function useOnContactsChange({
  onCreated,
  onDeleted,
}: {
  onCreated: (contact: Contact) => void;
  onDeleted: (contactId: string) => void;
}) {
  const onCreatedRef = useLatest(onCreated);
  const onDeletedRef = useLatest(onDeleted);

  useEffect(() => {
    const channel = boardwalkDb
      .channel('contacts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'contacts',
        },
        (payload: RealtimePostgresChangesPayload<BoardwalkDbContact>) => {
          console.log('onContactsChange', payload);
          if (payload.eventType === 'INSERT') {
            const newContact = ContactRepository.toContact(payload.new);
            onCreatedRef.current(newContact);
          } else if (payload.eventType === 'DELETE') {
            if (!payload.old.id) return;
            onDeletedRef.current(payload.old.id);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);
}

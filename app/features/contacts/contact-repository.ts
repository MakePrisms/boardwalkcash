import type { BoardwalkDb, BoardwalkDbContact } from '../boardwalk-db/database';
import type { Contact, CreateContact } from './contact';

export class ContactRepository {
  constructor(private readonly db: BoardwalkDb) {}

  async get(contactId: string) {
    const query = this.db.from('contacts').select('*').eq('id', contactId);

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to get contact', error);
    }

    return this.toContact(data);
  }

  /**
   * Gets all contacts for a user
   * @param ownerId - The ID of the user whose contacts to fetch
   * @returns Array of contacts
   */
  async list(
    ownerId: string,
    options?: { abortSignal?: AbortSignal },
  ): Promise<Contact[]> {
    const query = this.db
      .from('contacts')
      .select('*')
      .eq('owner_id', ownerId)
      .order('username', { ascending: true });

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to get contacts', error);
    }

    return data.map(this.toContact);
  }

  /**
   * Creates a new contact for a user
   * @param ownerId - The ID of the user who owns the contact
   * @param contact - The contact data to create
   * @returns The created contact
   */
  async create(
    ownerId: string,
    contact: CreateContact,
    options?: { abortSignal?: AbortSignal },
  ): Promise<Contact> {
    const query = this.db
      .from('contacts')
      .insert({
        owner_id: ownerId,
        username: contact.username,
      })
      .select();

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error('Failed to create contact', error);
    }

    return this.toContact(data);
  }

  /**
   * Deletes a contact
   * @param contactId - The ID of the contact to delete
   * @param ownerId - The ID of the owner (for verification)
   */
  async delete(
    contactId: string,
    ownerId: string,
    options?: { abortSignal?: AbortSignal },
  ): Promise<void> {
    const query = this.db
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('owner_id', ownerId);

    if (options?.abortSignal) {
      query.abortSignal(options.abortSignal);
    }

    const { error } = await query;

    if (error) {
      throw new Error('Failed to delete contact', error);
    }
  }

  /**
   * Search for users by partial username
   * @param query - The partial username to search for
   * @returns Array of user suggestions
   */
  //  QUESTION: should this function be here? same Questinoin contact-hooks
  async searchUsers(
    query: string,
    options?: { abortSignal?: AbortSignal; sort?: 'desc' | 'asc' },
  ): Promise<{ username: string }[] | null> {
    if (query.length < 3) {
      return null;
    }
    const rpcQuery = this.db.rpc(
      'search_users_by_partial_username',
      {
        partial_username: query,
      },
      {
        head: false,
        count: 'exact',
      },
    );

    if (options?.abortSignal) {
      rpcQuery.abortSignal(options.abortSignal);
    }

    const { data, error } = await rpcQuery;

    if (error) {
      throw new Error('Failed to search users', error);
    }

    return data;
  }

  /**
   * Converts a database contact record to a Contact object
   */
  private toContact(dbContact: BoardwalkDbContact): Contact {
    return {
      id: dbContact.id,
      createdAt: dbContact.created_at,
      ownerId: dbContact.owner_id,
      username: dbContact.username ?? '',
    };
  }
}

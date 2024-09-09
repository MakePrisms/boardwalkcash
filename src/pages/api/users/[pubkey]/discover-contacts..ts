import { NextApiRequest, NextApiResponse } from 'next';
import { findUserByPubkey, getManyUsersByNostrPubkey } from '@/lib/userModels';
import { authMiddleware, runMiddleware } from '@/utils/middleware';
import { getNostrContacts } from '@/utils/nostr';
import { DiscoverContactsResponse } from '@/types';

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse<DiscoverContactsResponse | { error: string }>,
) {
   await runMiddleware(req, res, authMiddleware);
   const { pubkey } = req.query;

   if (!pubkey || typeof pubkey !== 'string') {
      return res.status(400).json({ error: 'Invalid pubkey' });
   }

   if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
   }

   try {
      const user = await findUserByPubkey(pubkey);
      if (!user) {
         return res.status(404).json({ error: 'User not found' });
      }

      if (!user.nostrPubkey) {
         return res.status(400).json({ error: 'Nostr pubkey not authenticated' });
      }

      /* fetch all pubkeys in user's contact list */
      const nostrContacts = await getNostrContacts(user.nostrPubkey);

      /* find boardwalk users with these nostr pubkeys */
      const boardwalkUsers = await getManyUsersByNostrPubkey(nostrContacts);

      /* filter out contacts the user already has */
      const toDiscover = boardwalkUsers.filter(boardwalkUser => {
         /* skip this user */
         if (boardwalkUser.nostrPubkey === user.nostrPubkey) return false;
         /* check if this specific boardwalk user is not in the user's contacts */
         return !user.contacts.some(contact => contact.linkedUser?.pubkey === boardwalkUser.pubkey);
      }) as DiscoverContactsResponse['users'];

      return res.status(200).json({ users: toDiscover });
   } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).end();
   }
}

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

      /* filter out contacts the user already has and those without a nostr pubkey */
      const notAdded = nostrContacts.filter(c => {
         if (c === user.nostrPubkey) return false;
         return !user.contacts.some(
            u => u.linkedUser?.nostrPubkey === c || u.linkedUser?.nostrPubkey === null,
         );
      });

      /* find boardwalk users with these pubkeys */
      const toDiscover = (await getManyUsersByNostrPubkey(
         notAdded,
      )) as DiscoverContactsResponse['users'];

      return res.status(200).json({ users: toDiscover });
   } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).end();
   }
}

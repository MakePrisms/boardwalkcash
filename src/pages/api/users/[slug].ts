import type { NextApiRequest, NextApiResponse } from 'next';
import { addContactToUser, deleteUser, findUserByPubkey, updateUser } from '@/lib/userModels';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const { slug } = req.query;

   if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ message: 'Invalid slug' });
   }

   switch (req.method) {
      case 'GET':
         try {
            const user = await findUserByPubkey(slug.toString());
            if (user) {
               return res.status(200).json(user);
            } else {
               return res.status(404).json({ message: 'User not found' });
            }
         } catch (error: any) {
            return res.status(500).json({ message: error.message });
         }

      case 'PUT':
         try {
            if (req.body.contact) {
               await addContactToUser(slug, req.body.contact);
               return res.status(201).json({ message: 'Contact added' });
            }
            const { pubkey, username, mintUrl } = req.body;
            let updates = {};
            if (username) {
               updates = { ...updates, username };
            }
            if (mintUrl) {
               updates = { ...updates, mintUrl };
            }
            if (Object.keys(updates).length > 0) {
               const updatedUser = await updateUser(pubkey, updates);
               return res.status(200).json(updatedUser);
            }
         } catch (error: any) {
            console.log('Error:', error);
            return res.status(500).json({ message: error.message });
         }

      case 'DELETE':
         try {
            await deleteUser(Number(slug));
            return res.status(204).end();
         } catch (error: any) {
            return res.status(500).json({ message: error.message });
         }

      default:
         res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
         res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}

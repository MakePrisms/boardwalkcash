import { findContactByUsername } from '@/lib/contactModels';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const { slug } = req.query;

   if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ message: 'Invalid slug' });
   }

   console.log('slug:', slug);

   switch (req.method) {
      case 'GET':
         try {
            console.log('Looking for user with username:', slug.toString());
            const user = await findContactByUsername(slug.toString());
            if (user) {
               return res.status(200).json(user);
            } else {
               return res.status(404).json({ message: 'User not found' });
            }
         } catch (error: any) {
            return res.status(500).json({ message: error.message });
         }

      default:
         res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
         res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}

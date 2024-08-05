import type { NextApiRequest, NextApiResponse } from 'next';
import {
   ContactData,
   addContactToUser,
   deleteUser,
   findUserByPubkey,
   updateUser,
} from '@/lib/userModels';
import { Prisma, User } from '@prisma/client';
import { authMiddleware, runMiddleware } from '@/utils/middleware';
import { createNotification } from '@/lib/notificationModels';
import { NotificationType } from '@/types';

export type UserWithContacts = User & { contacts: ContactData[] };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await runMiddleware(req, res, authMiddleware);
   const { slug } = req.query;

   if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ message: 'Invalid slug' });
   }

   switch (req.method) {
      case 'GET':
         try {
            const user = await findUserByPubkey(slug.toString());
            if (user) {
               return res.status(200).json(user as UserWithContacts);
            } else {
               return res.status(404).json({ message: 'User not found' });
            }
         } catch (error: any) {
            return res.status(500).json({ message: error.message });
         }

      case 'PUT':
         try {
            if (req.body.linkedUserPubkey) {
               await addContactToUser(slug, req.body as ContactData);

               // notify the added user that they've been added as a contact
               await createNotification(
                  req.body.linkedUserPubkey,
                  NotificationType.NewContact,
                  slug,
               );

               return res.status(201).json({ message: 'Contact added' });
            }
            const { pubkey, username, defaultMintUrl: mintUrl } = req.body;
            let updates = {};
            if (username) {
               updates = { ...updates, username };
            }
            if (mintUrl) {
               updates = { ...updates, mintUrl };
            }
            if (Object.keys(updates).length > 0) {
               const updatedUser = await updateUser(slug, updates);
               return res.status(200).json(updatedUser);
            }
         } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
               if (error.code === 'P2002') {
                  return res.status(409).json({ message: 'Contact already exists' });
               }
               return res.status(400).json({ message: error.message });
            }
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

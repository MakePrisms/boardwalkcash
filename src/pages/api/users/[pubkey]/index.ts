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
import { findOrCreateMint } from '@/lib/mintModels';
import { CashuMint } from '@cashu/cashu-ts';

export type UserWithContacts = User & { contacts: ContactData[] };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await runMiddleware(req, res, authMiddleware);
   const { pubkey } = req.query;

   if (!pubkey || typeof pubkey !== 'string') {
      return res.status(400).json({ message: 'Invalid pubkey' });
   }

   switch (req.method) {
      case 'GET':
         try {
            const user = await findUserByPubkey(pubkey.toString());
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
               await addContactToUser(pubkey, req.body as ContactData);

               // notify the added user that they've been added as a contact
               await createNotification(
                  req.body.linkedUserPubkey,
                  NotificationType.NewContact,
                  pubkey,
               );

               return res.status(201).json({ message: 'Contact added' });
            }
            const {
               username,
               defaultMintUrl: mintUrl,
               defaultKeysetId,
               defaultUnit,
               hideFromLeaderboard,
               nostrPubkey,
               lud16,
               mintlessReceive,
            } = req.body;
            let updates = {};
            if (username) {
               updates = { ...updates, username };
            }
            if (mintUrl) {
               if (!defaultKeysetId) {
                  return res
                     .status(400)
                     .json({ message: 'Must specify default unit when updating mint' });
               }
               updates = { ...updates, mintUrl, defaultKeysetId, defaultUnit };
            } else if (defaultUnit) {
               updates = { ...updates, defaultUnit };
            }
            if (hideFromLeaderboard !== undefined) {
               updates = { ...updates, hideFromLeaderboard };
            }
            /* only allow removing nostr pubkey, otherwise otp is required to authenticate */
            if (nostrPubkey === null) {
               updates = { ...updates, nostrPubkey };
            }
            if (lud16 || lud16 === null) {
               updates = { ...updates, lud16 };
            }
            if (mintlessReceive !== undefined) {
               updates = { ...updates, mintlessReceive };
            }
            if (Object.keys(updates).length > 0) {
               const updatedUser = await updateUser(pubkey, updates);
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
            await deleteUser(Number(pubkey));
            return res.status(204).end();
         } catch (error: any) {
            return res.status(500).json({ message: error.message });
         }

      default:
         res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
         res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}

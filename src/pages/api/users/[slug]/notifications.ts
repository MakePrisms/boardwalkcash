import { NextApiRequest, NextApiResponse } from 'next';
import {
   getUserNotifications,
   markManyNotificationsAsRead,
   deleteManyNotifications,
} from '@/lib/notificationModels';
import {
   DeleteNotificationsRequest,
   DeleteNotificationsResponse,
   GetNotificationsResponse,
   MarkNotificationsAsReadRequest,
   NotificationType,
   UpdateNotificationsResponse,
} from '@/types';
import { authMiddleware, runMiddleware } from '@/utils/middleware';
import { NotifyTokenReceivedRequest } from '@/types';
import { proofsLockedTo } from '@/utils/cashu';
import { getDecodedToken } from '@cashu/cashu-ts';
import { notifyTokenReceived } from '@/lib/notificationModels';
import { Prisma } from '@prisma/client';
import { findManyContacts } from '@/lib/contactModels';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   runMiddleware(req, res, authMiddleware);

   const { slug: userPubkey } = req.query;

   if (typeof userPubkey !== 'string') {
      return res.status(400).json({ error: 'Invalid user public key' });
   }

   switch (req.method) {
      case 'GET':
         return handleGetNotifications(userPubkey, res);
      case 'POST':
         return handleNotifyTokenReceived(req, userPubkey, res);
      case 'PUT':
         return handleMarkAsRead(req, res);
      case 'DELETE':
         return handleDeleteNotifications(req, userPubkey, res);
      default:
         res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
         return res.status(405).end(`Method ${req.method} Not Allowed`);
   }
}

async function handleGetNotifications(userPubkey: string, res: NextApiResponse) {
   try {
      const notifications = await getUserNotifications(userPubkey);
      // find notifications for contacts
      const contactNotifications = notifications.filter(
         n => n.type === NotificationType.NewContact,
      );
      // fetch those contacts from db to return with notifications
      const contacts = await findManyContacts(contactNotifications.map(n => n.data));

      // add contacts to notifications
      const updatedNotifications = notifications.map(n => {
         if (n.type === NotificationType.NewContact) {
            const contact = contacts.find(c => c.pubkey === n.data);
            return { ...n, contact };
         }
         return n;
      });

      return res.status(200).json(updatedNotifications as GetNotificationsResponse);
   } catch (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
   }
}

async function handleNotifyTokenReceived(
   req: NextApiRequest,
   userPubkey: string,
   res: NextApiResponse,
) {
   const { token } = req.body as NotifyTokenReceivedRequest;

   if (!token) {
      return res.status(400).json({ error: 'Token is required' });
   }

   let receiverPubkey: string;
   try {
      const decoded = getDecodedToken(token);

      const pubkey = proofsLockedTo(decoded.token[0].proofs);

      if (!pubkey) {
         return res.status(400).json({ error: 'Token is not locked a single pubkey' });
      }
      receiverPubkey = pubkey.slice(2);
   } catch (error) {
      console.error('Error decoding token:', error);
      return res.status(500).json({ error: 'Failed to decode token' });
   }

   try {
      console.log('notifying token received to user', receiverPubkey);
      const notifications = await notifyTokenReceived(
         receiverPubkey,
         JSON.stringify({ token, from: userPubkey }),
      );
      return res.status(200).json({ status: 'ok' });
   } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
         if (error.code === 'P2003') {
            return res.status(404).json({ error: 'User not found' });
         }
      }
      console.error('Error notifying token received:', error);
      return res.status(500).json({ error: 'Failed to notify token received' });
   }
}

async function handleMarkAsRead(req: NextApiRequest, res: NextApiResponse) {
   const { ids } = req.body as MarkNotificationsAsReadRequest;

   if (!ids) {
      return res.status(400).json({ error: 'Notification IDs are required' });
   }

   try {
      const updatedNotifications = await markManyNotificationsAsRead(ids.map(Number));
      return res.status(200).json({ ids } as UpdateNotificationsResponse);
   } catch (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ error: 'Failed to mark notification as read' });
   }
}

async function handleDeleteNotifications(
   req: NextApiRequest,
   userPubkey: string,
   res: NextApiResponse,
) {
   const { ids } = req.body as DeleteNotificationsRequest;

   if (!ids) {
      return res.status(400).json({ error: 'Notification IDs are required' });
   }

   try {
      await deleteManyNotifications(ids.map(Number));
      const newNotifications = await getUserNotifications(userPubkey);
      return res.status(200).json(newNotifications as DeleteNotificationsResponse);
   } catch (error) {
      console.error('Error deleting notifications:', error);
      return res.status(500).json({ error: 'Failed to delete notifications' });
   }
}

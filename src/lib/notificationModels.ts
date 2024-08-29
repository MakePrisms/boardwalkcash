import prisma from '@/lib/prisma';
import { NotificationIncludeTokenAndContact, NotificationType } from '@/types';
import { Notification, Token } from '@prisma/client';

/**
 *
 * @param userPubkey User this notification is for
 * @param type Token for received tokens, NewContact for other user's that added you as a contact
 * @param data token or contact pubkey
 * @returns
 */
export async function createNotification(
   userPubkey: string,
   type: NotificationType,
   data: {
      tokenId?: string;
      contactId?: number;
   },
): Promise<Notification> {
   console.log('creating notification', userPubkey, type, data);
   return prisma.notification.create({
      data: {
         userPubkey,
         type,
         tokenId: data.tokenId,
         contactId: data.contactId,
      },
   });
}

export async function getUserNotifications(userPubkey: string) {
   return prisma.notification.findMany({
      where: {
         userPubkey,
      },
      orderBy: {
         createdAt: 'desc',
      },
      include: {
         token: {
            include: {
               gift: true,
            },
         },
         Contact: {
            select: {
               linkedUser: {
                  select: {
                     username: true,
                     pubkey: true,
                  },
               },
            },
         },
      },
   });
}

export async function getNotification(id: number): Promise<Notification | null> {
   return prisma.notification.findUnique({
      where: { id },
   });
}

export async function markNotificationAsRead(id: number): Promise<Notification> {
   return prisma.notification.update({
      where: { id },
      data: { isRead: true },
   });
}

export async function markManyNotificationsAsRead(id: number[]) {
   return prisma.notification.updateMany({
      where: { id: { in: id } },
      data: { isRead: true },
   });
}

export async function deleteNotification(id: number): Promise<Notification> {
   return prisma.notification.delete({
      where: { id },
   });
}

export async function deleteManyNotifications(id: number[]) {
   return prisma.notification.deleteMany({
      where: { id: { in: id } },
   });
}

export async function deleteReadNotifications(userPubkey: string): Promise<{ count: number }> {
   return prisma.notification.deleteMany({
      where: {
         userPubkey,
         isRead: true,
      },
   });
}

export async function notifyTokenReceived(receiverPubkey: string, tokenId: string) {
   return prisma.notification.create({
      data: {
         userPubkey: receiverPubkey,
         type: NotificationType.Token,
         tokenId,
      },
   });
}

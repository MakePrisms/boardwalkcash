import prisma from '@/lib/prisma';
import { NotificationType } from '@/types';
import { Notification } from '@prisma/client';

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
   data: string,
): Promise<Notification> {
   return prisma.notification.create({
      data: {
         userPubkey,
         type,
         data,
      },
   });
}

export async function getUserNotifications(userPubkey: string): Promise<Notification[]> {
   return prisma.notification.findMany({
      where: {
         userPubkey,
      },
      orderBy: {
         createdAt: 'desc',
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

export async function notifyTokenReceived(receiverPubkey: string, token: string) {
   return prisma.notification.create({
      data: {
         userPubkey: receiverPubkey,
         type: NotificationType.Token,
         data: token,
      },
   });
}

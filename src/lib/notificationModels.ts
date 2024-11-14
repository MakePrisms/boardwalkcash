import prisma from '@/lib/prisma';
import { NotificationType } from '@/types';
import { MintlessTransaction, Notification, Token } from '@prisma/client';

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
   data: string | null,
   tokenId?: string,
): Promise<Notification> {
   return prisma.notification.create({
      data: {
         userPubkey,
         type,
         data,
         tokenId,
      },
   });
}

export async function createMintlessTransactionAndNotification(
   giftId: number | null,
   amount: number,
   recipientPubkey: string,
   createdByPubkey: string,
   isFee: boolean = false,
): Promise<{ mintlessTransaction: MintlessTransaction; notification: Notification }> {
   return prisma.$transaction(async prisma => {
      const notification = await prisma.notification.create({
         data: {
            userPubkey: recipientPubkey,
            type: NotificationType.MintlessTransaction,
            isRead: false,
         },
      });

      const mintlessTransaction = await prisma.mintlessTransaction.create({
         data: {
            giftId,
            notificationId: notification.id.toString(),
            amount,
            recipientPubkey,
            createdByPubkey,
            isFee,
            Notification: {
               connect: { id: notification.id },
            },
         },
      });

      await prisma.notification.update({
         where: { id: notification.id },
         data: { mintlessTransactionId: mintlessTransaction.id },
      });

      return { mintlessTransaction, notification };
   });
}

export async function getUserNotifications(
   userPubkey: string,
): Promise<
   (Notification & { token: Token | null; mintlessTransaction: MintlessTransaction | null })[]
> {
   return prisma.notification.findMany({
      where: {
         userPubkey,
      },
      orderBy: {
         createdAt: 'desc',
      },
      include: {
         token: true,
         mintlessTransaction: true,
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

export async function notifyTokenReceived(receiverPubkey: string, token: string, tokenId?: string) {
   return prisma.notification.create({
      data: {
         userPubkey: receiverPubkey,
         type: NotificationType.Token,
         data: token,
         tokenId,
      },
   });
}

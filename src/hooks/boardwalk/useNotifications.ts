import {
   ContactNotificationData,
   Currency,
   DeleteNotificationsResponse,
   GetNotificationResponse,
   GetNotificationsResponse,
   MintlessTransactionNotificationData,
   NotificationType,
   NotificationWithData,
   PublicContact,
   TokenNotificationData,
   UpdateNotificationsResponse,
} from '@/types';
import { authenticatedRequest } from '@/utils/appApiRequests';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import { Token, getDecodedToken } from '@cashu/cashu-ts';
import { areTokensSpent } from '@/utils/cashu';
import useContacts from './useContacts';
import useGifts from './useGifts';

const useNotifications = () => {
   const user = useSelector((state: RootState) => state.user);
   const [notifications, setNotifications] = useState<NotificationWithData[]>([]);
   const [unreadNotifications, setUnreadNotifications] = useState<number[]>([]);
   const { getGiftById } = useGifts();
   const { isContactAdded } = useContacts();

   useEffect(() => {
      setUnreadNotifications(notifications.filter(n => !n.isRead).map(n => n.id) || []);
   }, [notifications]);

   const pubkey = useMemo(() => user.pubkey || '', [user]);

   const getNotifications = async (pubkey: string) => {
      const response = await authenticatedRequest<GetNotificationsResponse>(
         `/api/users/${pubkey}/notifications`,
         'GET',
         undefined,
      );
      return response;
   };

   const loadNotifications = useCallback(async () => {
      if (!pubkey) return;
      const allNotifications = await getNotifications(pubkey);
      console.log('allNotifications', allNotifications);
      const newNotifications = allNotifications.filter(
         newNotification =>
            !notifications.some(
               existingNotification => existingNotification.id === newNotification.id,
            ),
      );
      const processedNotifications = await processNotifications(newNotifications);
      setNotifications(prevNotifications => {
         const newNotifs = processedNotifications.filter(
            n => !prevNotifications.some(pn => pn.id === n.id),
         );
         return [...newNotifs, ...prevNotifications];
      });
   }, [getNotifications, notifications]);

   const sendTokenAsNotification = useCallback(
      async (token: string, txid?: string) => {
         await authenticatedRequest<unknown>(`/api/users/${pubkey}/notifications`, 'POST', {
            token,
            txid,
         });
      },
      [pubkey],
   );

   const markAllNotificationsAsRead = useCallback(async () => {
      if (unreadNotifications.length === 0) return;
      const response = await authenticatedRequest<UpdateNotificationsResponse>(
         `/api/users/${pubkey}/notifications`,
         'PUT',
         { ids: unreadNotifications },
      );
      setUnreadNotifications([]);
      return response;
   }, [unreadNotifications, pubkey]);

   const clearNotification = useCallback(
      async (notificationId: number) => {
         const { ids: deletedIds } = await authenticatedRequest<DeleteNotificationsResponse>(
            `/api/users/${pubkey}/notifications`,
            'DELETE',
            {
               ids: [notificationId],
            },
         );

         setNotifications(prevNotifications => {
            const newNotifications = prevNotifications.filter(n => n.id !== notificationId);
            return newNotifications;
         });
      },
      [pubkey],
   );

   const calculateTimeAgo = (createdAt: Date) => {
      const now = new Date();
      const createdAtDate = new Date(createdAt);
      const diffInSeconds = Math.floor((now.getTime() - createdAtDate.getTime()) / 1000);

      if (diffInSeconds < 60) {
         return `${diffInSeconds}s`;
      } else if (diffInSeconds < 3600) {
         return `${Math.floor(diffInSeconds / 60)}m`;
      } else if (diffInSeconds < 86400) {
         return `${Math.floor(diffInSeconds / 3600)}h`;
      } else {
         return `${Math.floor(diffInSeconds / 86400)}d`;
      }
   };

   const processTokenNotification = async (
      notification: GetNotificationResponse,
   ): Promise<TokenNotificationData> => {
      let rawToken: string | null = null;
      let contact: PublicContact | null = null;
      if (notification.type === NotificationType.TIP) {
         rawToken = notification.data;
      } else if (notification.type === NotificationType.Token) {
         if (!notification.data) {
            throw new Error('Notification data is null');
         }
         const { token, from } = JSON.parse(notification.data);
         rawToken = token;
         contact = notification.contact;
      }
      if (!rawToken) {
         throw new Error('Could not get raw token from notification');
      }
      const token = getDecodedToken(rawToken);
      const giftId = notification.token?.giftId || null;
      const gift = giftId ? getGiftById(giftId) : null;
      return {
         token,
         rawToken,
         contact,
         isTip: notification.type === NotificationType.TIP,
         timeAgo: calculateTimeAgo(notification.createdAt),
         tokenState: 'unclaimed',
         gift,
         isFee: notification.token?.isFee || false,
         type: NotificationType.Token,
      };
   };

   const processContactNotification = async (
      notification: GetNotificationResponse,
   ): Promise<ContactNotificationData> => {
      const contact = notification.contact;
      if (!contact) {
         throw new Error('Contact is missing from notification');
      }
      const contactPubkey = contact.pubkey;
      const contactIsAdded = await isContactAdded({ pubkey: contactPubkey });
      return {
         id: notification.id,
         contact,
         contactIsAdded,
         timeAgo: calculateTimeAgo(notification.createdAt),
         type: NotificationType.NewContact,
      };
   };

   const processMintlessTransactionNotification = (
      notification: GetNotificationResponse,
   ): MintlessTransactionNotificationData => {
      if (!notification.mintlessTransaction) {
         throw new Error('Mintless transaction is missing from notification');
      }
      const contact = notification.contact;
      const { id, amount, isFee, giftId, createdAt } = notification.mintlessTransaction;
      const gift = giftId ? getGiftById(giftId) : null;
      return {
         id,
         amount,
         contact,
         isFee,
         gift,
         unit: Currency.SAT /* assuming all mintless transactions are sats */,
         timeAgo: calculateTimeAgo(createdAt),
         type: NotificationType.MintlessTransaction,
      };
   };

   const processNotifications = async (
      notifications: GetNotificationsResponse,
   ): Promise<NotificationWithData[]> => {
      const processedNotifications = await Promise.all(
         notifications.map(async notification => {
            let processedData;
            switch (notification.type) {
               case NotificationType.NewContact:
                  processedData = await processContactNotification(notification);
                  break;
               case NotificationType.MintlessTransaction:
                  processedData = processMintlessTransactionNotification(notification);
                  break;
               default:
                  processedData = await processTokenNotification(notification);
            }
            return {
               ...notification,
               processedData,
            };
         }),
      );

      const tokenEntries: [string, Token][] = processedNotifications
         .filter(notification => 'token' in notification.processedData)
         .map(notification => [
            notification.id.toString(),
            (notification.processedData as TokenNotificationData).token,
         ]);

      const tokenStates = await areTokensSpent(tokenEntries);

      return processedNotifications.map(notification => {
         if ('token' in notification.processedData) {
            return {
               ...notification,
               processedData: {
                  ...notification.processedData,
                  tokenState: tokenStates[notification.id.toString()] ? 'claimed' : 'unclaimed',
               },
            };
         }
         return notification;
      });
   };

   return {
      notifications,
      unreadNotifications,
      loadNotifications,
      sendTokenAsNotification,
      markAllNotificationsAsRead,
      clearNotification,
   };
};

export default useNotifications;

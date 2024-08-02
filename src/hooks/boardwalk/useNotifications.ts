import {
   DeleteNotificationsResponse,
   GetNotificationsResponse,
   UpdateNotificationsResponse,
} from '@/types';
import { Notification } from '@prisma/client';
import { authenticatedRequest } from '@/utils/appApiRequests';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';

const useNotifications = () => {
   const user = useSelector((state: RootState) => state.user);
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);

   useEffect(() => {
      setUnreadNotifications(notifications.filter(n => !n.isRead));
   }, [notifications]);

   const pubkey = useMemo(() => user.pubkey || '', [user]);

   const getNotifications = useCallback(async () => {
      const response = await authenticatedRequest<GetNotificationsResponse>(
         `/api/users/${pubkey}/notifications`,
         'GET',
         undefined,
      );
      return response;
   }, [pubkey]);

   const loadNotifications = useCallback(async () => {
      const allNotifications = await getNotifications();
      setNotifications(allNotifications);
   }, [getNotifications]);

   const sendTokenAsNotification = useCallback(
      async (token: string) => {
         await authenticatedRequest<unknown>(`/api/users/${pubkey}/notifications`, 'POST', {
            token,
         });
      },
      [pubkey],
   );

   const markAllNotificationsAsRead = useCallback(async () => {
      if (unreadNotifications.length === 0) return;
      const response = await authenticatedRequest<UpdateNotificationsResponse>(
         `/api/users/${pubkey}/notifications`,
         'PUT',
         { ids: unreadNotifications.map(n => n.id) },
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

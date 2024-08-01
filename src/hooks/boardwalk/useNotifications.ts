import { GetNotificationsResponse, UpdateNotificationsResponse } from '@/types';
import { Notification } from '@prisma/client';
import { authenticatedRequest } from '@/utils/appApiRequests';
import { useCallback, useMemo, useState } from 'react';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';

const useNotifications = () => {
   const user = useSelector((state: RootState) => state.user);
   const [notifications, setNotifications] = useState<Notification[]>([]);

   const unreadNotifications = useMemo(() => notifications.filter(n => !n.isRead), [notifications]);

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
      return response;
   }, [unreadNotifications, pubkey]);

   const clearNotification = useCallback(
      async (notificationId: number) => {
         const newNotifications = await authenticatedRequest<GetNotificationsResponse>(
            `/api/users/${pubkey}/notifications`,
            'DELETE',
            {
               ids: [notificationId],
            },
         );
         setNotifications(newNotifications);
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

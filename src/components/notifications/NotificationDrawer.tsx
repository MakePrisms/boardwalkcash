import { customDrawerTheme } from '@/themes/drawerTheme';
import { BellAlertIcon, BellIcon } from '@/components/icons/BellIcon';
import XMarkIcon from '@/components/icons/XMarkIcon';
import { Drawer } from 'flowbite-react';
import { useEffect, useState } from 'react';
import useNotifications from '@/hooks/boardwalk/useNotifications';
import NotificationItem from './NotificationItem';
import NotificationItemContainer from './NotificationItemContainer';
import { NotificationType } from '@/types';

const NotificationDrawer = () => {
   const [hidden, setHidden] = useState(true);

   const {
      notifications,
      loadNotifications,
      unreadNotifications,
      markAllNotificationsAsRead,
      clearNotification,
   } = useNotifications();

   useEffect(() => {
      loadNotifications();
   }, [loadNotifications]);

   useEffect(() => {
      const updateNotifications = async () => {
         await loadNotifications();
         await markAllNotificationsAsRead();
      };
      if (!hidden) {
         updateNotifications();
      }
   }, [hidden]);

   const handleClearNotification = (notificationId: number) => async () => {
      await clearNotification(notificationId);
   };

   return (
      <>
         <button className='fixed left-0 top-0 m-4 p-2 z-10' onClick={() => setHidden(!hidden)}>
            {unreadNotifications.length > 0 ? <BellAlertIcon /> : <BellIcon />}
         </button>
         <Drawer
            open={!hidden}
            onClose={() => setHidden(true)}
            edge={false}
            position='left'
            className='md:min-w-fit min-w-full bg-[#0f1f41ff] text-white flex flex-col'
            theme={customDrawerTheme}
         >
            <Drawer.Header
               className='drawer-header'
               title='Notifications'
               titleIcon={() => null}
               closeIcon={() => <XMarkIcon className='h-8 w-8' />}
            />
            <Drawer.Items className='md:w-96 max-w-screen-sm'>
               {notifications.length > 0 ? (
                  <div className='flex flex-col h-full space-y-2'>
                     {notifications.map(notification => (
                        <NotificationItemContainer
                           key={`${notification.id}-${notification.type}`}
                           notificationType={notification.type as NotificationType}
                        >
                           <NotificationItem
                              notification={notification}
                              clearNotification={handleClearNotification(notification.id)}
                           />
                        </NotificationItemContainer>
                     ))}
                  </div>
               ) : (
                  <div className='flex justify-center mt-4'>No notifications</div>
               )}
            </Drawer.Items>
         </Drawer>
      </>
   );
};

export default NotificationDrawer;

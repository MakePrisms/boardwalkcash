import { customDrawerTheme } from '@/themes/drawerTheme';
import { BellAlertIcon, BellIcon } from '@/components/icons/BellIcon';
import XMarkIcon from '@/components/icons/XMarkIcon';
import { Drawer } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useNotifications from '@/hooks/boardwalk/useNotifications';
import NotificationItem from './NotificationItem';
import NotificationItemContainer from './NotificationItemContainer';
import { NotificationType, NotificationWithData } from '@/types';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';

const NotificationDrawer = () => {
   const [hidden, setHidden] = useState(true);
   const ecashTapsEnabled = useSelector((state: RootState) => state.settings.ecashTapsEnabled);

   const scrollerRef = useRef<HTMLElement | Window | null>(null);
   const setScrollerRef = useCallback((ref: HTMLElement | Window | null) => {
      scrollerRef.current = ref;
   }, []);

   const {
      notifications,
      loadNotifications,
      unreadNotifications,
      markAllNotificationsAsRead,
      clearNotification,
   } = useNotifications();

   useEffect(() => {
      loadNotifications();
   }, []);

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

   const iconPosition = useMemo(() => {
      if (ecashTapsEnabled) {
         return `left-12 top-0`;
      }
      return `left-0 top-0`;
   }, [ecashTapsEnabled]);

   const renderNotification = (_index: number, notification: NotificationWithData) => {
      // TODO: thist should be in the notification, but gift types are not set in the db yet
      const isGift = 'gift' in notification.processedData && notification.processedData.gift;
      const notificationType = isGift ? NotificationType.Gift : notification.type;
      return (
         <NotificationItemContainer
            key={`${notification.id}-${notification.type}`}
            notificationType={notificationType as NotificationType}
         >
            <NotificationItem
               notification={notification}
               clearNotification={handleClearNotification(notification.id)}
            />
         </NotificationItemContainer>
      );
   };

   return (
      <>
         <button
            className={`fixed ${iconPosition} m-4 p-2 z-10`}
            onClick={() => setHidden(!hidden)}
         >
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
            <Drawer.Items
               className='md:w-96 max-w-screen-sm overflow-y-auto mb-16'
               style={{ height: 'calc(100vh - 100px)' }}
            >
               {notifications.length > 0 ? (
                  <Virtuoso
                     data={notifications}
                     itemContent={renderNotification}
                     style={{ scrollbarWidth: 'none' }}
                     scrollerRef={setScrollerRef}
                     totalCount={200}
                     overscan={200}
                     increaseViewportBy={{ bottom: 200, top: 200 }}
                  />
               ) : (
                  <div className='flex justify-center mt-4'>No notifications</div>
               )}
            </Drawer.Items>
         </Drawer>
      </>
   );
};

export default NotificationDrawer;

import { NotificationType } from '@/types';
import { UserCircleIcon } from '@heroicons/react/20/solid';
import { useMemo } from 'react';
import { BanknoteIcon } from '../EcashTapButton';
import GiftIcon from '../icons/GiftIcon';

interface NotificationItemContainerProps {
   children: React.ReactNode;
   notificationType: NotificationType;
}

const NotificationItemContainer = ({
   children,
   notificationType,
}: NotificationItemContainerProps) => {
   const icon = useMemo(() => {
      switch (notificationType) {
         case NotificationType.NewContact:
            return (
               <div className='w-6 h-6 text-gray-500'>
                  {<UserCircleIcon className='w-6 h-6 text-white' />}
               </div>
            );
         case NotificationType.Token:
            return (
               <div className='w-6 h-6 text-gray-500'>
                  {<BanknoteIcon className='w-6 h-6 text-white' />}
               </div>
            );
         case NotificationType.TIP:
            return (
               <div className='w-6 h-6 text-gray-500'>
                  {<BanknoteIcon className='w-6 h-6 text-white' />}
               </div>
            );
         case NotificationType.Gift:
            return (
               <div className='w-6 h-6 text-gray-500'>
                  {<GiftIcon className='w-6 h-6 text-white' />}
               </div>
            );
         default:
            console.error('Unknown notification type', notificationType);
            return null;
      }
   }, [notificationType]);

   return (
      <div className='flex flex-row items-center justify-start space-x-4 bg-[var(--background-end-rgb)] rounded-sm w-full px-4 py-4 mb-2'>
         <div className='w-6 h-6 text-gray-500'>{icon}</div>
         <div className='flex flex-col justify-between w-full space-y-1'>{children}</div>
      </div>
   );
};

export default NotificationItemContainer;

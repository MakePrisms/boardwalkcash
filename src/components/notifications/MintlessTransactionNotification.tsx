import ViewMintlessTransactionButton from './buttons/ViewMintlessTransactionButton';
import ClearNotificationButton from './buttons/ClearNotificationButton';
import { MintlessTransactionNotificationData } from '@/types';
import NotificationItemText from './NotificationItemText';
import { formatSats } from '@/utils/formatting';
import { useMemo } from 'react';

interface TokenNotificationProps {
   data: MintlessTransactionNotificationData;
   clearNotification: () => void;
}

const MintlessTransactionNotification = ({ data, clearNotification }: TokenNotificationProps) => {
   const { amount, contact, gift, timeAgo, unit } = data;

   const notificationText = useMemo(() => {
      const formattedAmount = formatSats(amount);
      if (gift) {
         const getArticle = (word: string) => {
            return ['a', 'e', 'i', 'o', 'u'].includes(word.toLowerCase()[0]) ? 'an' : 'a';
         };
         return `${contact?.username} sent you ${getArticle(gift.name)} ${gift.name}`;
      } else {
         return `${contact?.username} sent you ${formattedAmount}`;
      }
   }, [contact?.username, amount, gift]);

   const buttons = useMemo(() => {
      return [
         <ClearNotificationButton key={0} clearNotification={clearNotification} />,
         <ViewMintlessTransactionButton
            key={1}
            contact={contact}
            amountUnit={amount}
            unit={unit}
            gift={gift}
         />,
      ];
   }, [clearNotification, contact, amount, unit, gift]);

   return (
      <>
         <NotificationItemText text={notificationText} time={timeAgo} />
         <div className={`flex space-x-4 justify-start`}>{buttons}</div>
      </>
   );
};

export default MintlessTransactionNotification;

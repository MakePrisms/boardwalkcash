import { MintlessTransactionNotificationData } from '@/types';
import { formatSats } from '@/utils/formatting';
import { useMemo } from 'react';
import ClearNotificationButton from './buttons/ClearNotificationButton';
import NotificationItemText from './NotificationItemText';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import ViewMintlessTransactionButton from './buttons/ViewMintlessTransactionButton';

interface TokenNotificationProps {
   data: MintlessTransactionNotificationData;
   clearNotification: () => void;
}

const MintlessTransactionNotification = ({ data, clearNotification }: TokenNotificationProps) => {
   const { amount, contact, gift, timeAgo, unit } = data;
   const user = useSelector((state: RootState) => state.user);

   const notificationText = useMemo(() => {
      const formattedAmount = formatSats(amount);
      if (gift) {
         const getArticle = (word: string) => {
            return ['a', 'e', 'i', 'o', 'u'].includes(word.toLowerCase()[0]) ? 'an' : 'a';
         };
         return `${contact?.username} sent you ${getArticle(gift)} ${gift}`;
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
            giftName={gift}
         />,
      ];
   }, [clearNotification, contact, amount, gift]);

   return (
      <>
         <NotificationItemText text={notificationText} time={timeAgo} />
         <div className={`flex space-x-4 justify-start`}>{buttons}</div>
      </>
   );
};

export default MintlessTransactionNotification;

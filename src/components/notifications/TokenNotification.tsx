import { TokenNotificationData } from '@/types';
import { formatTokenAmount } from '@/utils/formatting';
import { useMemo } from 'react';
import ClearNotificationButton from './buttons/ClearNotificationButton';
import ViewTokenButton from './buttons/ViewTokenButton';
import ClaimTokenButton from './buttons/ClaimTokenButton';
import NotificationItemText from './NotificationItemText';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

interface TokenNotificationProps {
   data: TokenNotificationData;
   clearNotification: () => void;
}

const TokenNotification = ({ data, clearNotification }: TokenNotificationProps) => {
   const { token, contact, isTip, timeAgo, tokenState, gift, isFee } = data;
   const user = useSelector((state: RootState) => state.user);
   const selfContact = useMemo(() => user.contacts.find(c => c.pubkey === user.pubkey), [user]);

   const amountCents = useMemo(
      () => token.token[0].proofs.reduce((acc, p) => acc + p.amount, 0),
      [token],
   );

   const notificationText = useMemo(() => {
      const formattedAmount = formatTokenAmount(token);
      if (isFee === true && gift) {
         return `${contact?.username} sent ${gift.name}: ${formattedAmount} fee`;
      }
      if (isTip) {
         return `You got tipped ${formattedAmount}`;
      }
      let firstPart = '';
      if (contact?.username) {
         firstPart = `${contact.username} sent you`;
      } else {
         firstPart = 'You received';
      }

      const getArticle = (word: string) => {
         return ['a', 'e', 'i', 'o', 'u'].includes(word.toLowerCase()[0]) ? 'an' : 'a';
      };

      if (gift) {
         const article = getArticle(gift.name);
         return `${firstPart} ${article} ${gift.name} eGift`;
      }
      return `${firstPart} ${formattedAmount}`;
   }, [contact, isTip, gift, isFee, token]);

   const buttons = useMemo(() => {
      if (tokenState === 'claimed') {
         return [<ClearNotificationButton key={0} clearNotification={clearNotification} />];
      } else {
         return [
            <ViewTokenButton
               key={0}
               token={token}
               clearNotification={clearNotification}
               contact={contact || selfContact}
            />,
            <ClaimTokenButton key={1} token={token} clearNotification={clearNotification} />,
         ];
      }
   }, [tokenState, token, clearNotification]);

   return (
      <>
         <NotificationItemText text={notificationText} time={timeAgo} />
         <div className={`flex space-x-4 justify-start`}>{buttons}</div>
      </>
   );
};

export default TokenNotification;

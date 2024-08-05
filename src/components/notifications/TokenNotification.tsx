import { TokenNotificationData } from '@/types';
import { formatCents } from '@/utils/formatting';
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
   const { token, contact, isTip, timeAgo, tokenState } = data;
   const user = useSelector((state: RootState) => state.user);
   const selfContact = useMemo(() => user.contacts.find(c => c.pubkey === user.pubkey), [user]);

   const amountCents = useMemo(
      () => token.token[0].proofs.reduce((acc, p) => acc + p.amount, 0),
      [token],
   );

   const notificationText = useMemo(() => {
      const formattedAmount = formatCents(amountCents);
      if (isTip) {
         return `You got tipped ${formattedAmount}`;
      }
      let firstPart = '';
      if (contact?.username) {
         firstPart = `${contact.username} sent you`;
      } else {
         firstPart = 'You received';
      }
      return `${firstPart} ${formattedAmount}`;
   }, [contact, amountCents, isTip]);

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

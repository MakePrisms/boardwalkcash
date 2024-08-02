import useContacts from '@/hooks/boardwalk/useContacts';
import { PublicContact } from '@/types';
import { isTokenSpent } from '@/utils/cashu';
import { formatCents } from '@/utils/formatting';
import { getDecodedToken } from '@cashu/cashu-ts';
import { useEffect, useMemo, useState } from 'react';
import ClearNotificationButton from './buttons/ClearNotificationButton';
import ViewTokenButton from './buttons/ViewTokenButton';
import ClaimTokenButton from './buttons/ClaimTokenButton';
import NotificationItemText from './NotificationItemText';

interface TokenNotificationProps {
   token: string;
   from: string;
   isTip?: boolean;
   timeAgo: string;
   clearNotification: () => void;
}

const TokenNotification = ({
   token,
   from,
   clearNotification,
   timeAgo,
   isTip,
}: TokenNotificationProps) => {
   const [contact, setContact] = useState<PublicContact | null>(null);
   const [tokenState, setTokenState] = useState<'claimed' | 'unclaimed'>('unclaimed');
   const { fetchContact } = useContacts();

   useEffect(() => {
      if (from === '' && isTip) {
         setContact(null);
         return;
      }
      fetchContact(from).then(setContact);
   }, [from, isTip, fetchContact]);

   useEffect(() => {
      isTokenSpent(token).then((isSpent: boolean) => {
         if (isSpent) {
            setTokenState('claimed');
         }
      });
   }, [token]);

   const decodedToken = useMemo(() => getDecodedToken(token), [token]);
   const amountCents = useMemo(
      () => decodedToken.token[0].proofs.reduce((acc, p) => acc + p.amount, 0),
      [decodedToken],
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
            <ViewTokenButton key={0} token={decodedToken} clearNotification={clearNotification} />,
            <ClaimTokenButton key={1} token={decodedToken} clearNotification={clearNotification} />,
         ];
      }
   }, [tokenState, decodedToken, clearNotification]);

   return (
      <>
         <NotificationItemText text={notificationText} time={timeAgo} />
         <div className={`flex space-x-4 justify-start`}>{buttons}</div>
      </>
   );
};

export default TokenNotification;

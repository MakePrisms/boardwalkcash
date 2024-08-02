import useContacts from '@/hooks/boardwalk/useContacts';
import { PublicContact } from '@/types';
import { isTokenSpent } from '@/utils/cashu';
import { formatCents } from '@/utils/formatting';
import { getDecodedToken } from '@cashu/cashu-ts';
import { useEffect, useMemo, useState } from 'react';
import ClearNotificationButton from './buttons/ClearNotificationButton';
import ViewTokenButton from './buttons/ViewTokenButton';
import ClaimTokenButton from './buttons/ClaimTokenButton';

interface TokenNotificationProps {
   token: string;
   from: string;
   timeAgo: string;
   clearNotification: () => void;
}

const TokenNotification = ({ token, from, clearNotification, timeAgo }: TokenNotificationProps) => {
   const [contact, setContact] = useState<PublicContact | null>(null);
   const [tokenState, setTokenState] = useState<'claimed' | 'unclaimed'>('unclaimed');
   const { fetchContact } = useContacts();

   useEffect(() => {
      fetchContact(from).then(setContact);
   }, [from]);

   useEffect(() => {
      console.log('TOKEN', token);
      isTokenSpent(token).then((isSpent: boolean) => {
         if (isSpent) {
            setTokenState('claimed');
         }
      });
      // return () => {
      //    setTokenState('unclaimed');
      // };
   }, [token]);

   const decodedToken = useMemo(() => getDecodedToken(token), [token]);
   const amountCents = useMemo(
      () => decodedToken.token[0].proofs.reduce((acc, p) => acc + p.amount, 0),
      [decodedToken],
   );

   const notificationText = useMemo(() => {
      const formattedAmount = formatCents(amountCents);
      let firstPart = '';
      if (contact?.username) {
         firstPart = `${contact.username} sent you`;
      } else {
         firstPart = 'You received';
      }
      return `${firstPart} ${formattedAmount}`;
   }, [contact, amountCents]);

   const buttons = useMemo(() => {
      if (tokenState === 'claimed') {
         return [<ClearNotificationButton key={0} clearNotification={clearNotification} />];
      } else {
         return [
            <ViewTokenButton key={0} token={decodedToken} clearNotification={clearNotification} />,
            <ClaimTokenButton key={1} token={decodedToken} clearNotification={clearNotification} />,
         ];
      }
   }, [tokenState, decodedToken]);

   return (
      <>
         <p className='notification-text'>
            {notificationText} - {timeAgo}
         </p>
         <div className={`flex space-x-4 justify-start`}>{buttons}</div>
      </>
   );
};

export default TokenNotification;

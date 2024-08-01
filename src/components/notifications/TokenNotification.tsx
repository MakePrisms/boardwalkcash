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
   clearNotification: () => void;
}

const TokenNotification = ({ token, from, clearNotification }: TokenNotificationProps) => {
   const [contact, setContact] = useState<PublicContact | null>(null);
   const [tokenState, setTokenState] = useState<'claimed' | 'unclaimed'>('unclaimed');
   const { fetchContact } = useContacts();

   useEffect(() => {
      fetchContact(from).then(setContact);
   }, [from]);

   useEffect(() => {
      console.log('TOKEN', token);
      isTokenSpent(token).then((isSpent: boolean) => {
         console.log('IS SPENT', isSpent);
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
         <p className='text-end'>{notificationText}</p>
         <div className={`flex space-x-4 ${buttons.length === 1 ? 'justify-end' : 'justify-end'}`}>
            {buttons}
         </div>
      </>
   );
};

export default TokenNotification;

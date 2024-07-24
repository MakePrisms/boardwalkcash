import { RootState } from '@/redux/store';
import { PublicContact } from '@/types';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

const useContacts = () => {
   const contacts = useSelector((state: RootState) => state.user.contacts);

   const fetchContactFromServer = async (pubkey: string) => {
      const res = await fetch(`/api/users/pubkey/${pubkey}`);

      if (res.status === 200) {
         const contact = (await res.json()) as PublicContact;
         return contact;
      }

      return null;
   };

   const fetchContact = useCallback(
      async (pubkey: string) => {
         let contact = contacts.find(c => c.pubkey === pubkey) || null;

         if (!contact) {
            contact = await fetchContactFromServer(pubkey);
         }

         return contact;
      },
      [contacts],
   );

   return { fetchContact };
};

export default useContacts;

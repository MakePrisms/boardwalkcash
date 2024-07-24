import { EcashTransaction, TxStatus } from '@/redux/slices/HistorySlice';
import { RootState, useAppDispatch } from '@/redux/store';
import { PublicContact } from '@/types';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ContactData } from '@/lib/userModels';
import { addContactAction } from '@/redux/slices/UserSlice';

type ContactTxData = {
   numTxs: number;
   lastTxDate: Date;
   totalTxAmountCents: number;
};

type ContactTxDataRecord = Record<string, ContactTxData>;

const useContacts = () => {
   const contacts = useSelector((state: RootState) => state.user.contacts);
   const txHistory = useSelector((state: RootState) => state.history);

   const dispatch = useAppDispatch();

   // transactions with an associated pubkey
   const transactionsToPubkey = useMemo(() => {
      const { ecash: txs } = txHistory;

      return txs.filter(tx => tx.pubkey !== undefined) as (EcashTransaction & { pubkey: string })[];
   }, [txHistory]);

   // tx data for each contact
   const { contactTxData, otherContacts } = useMemo(() => {
      const contactTxData = transactionsToPubkey.reduce((acc: ContactTxDataRecord, tx) => {
         const contact = contacts.find(c => c.pubkey === tx.pubkey.slice(2));

         if (!contact) return acc;

         if (acc[contact.pubkey] === undefined) {
            acc[contact.pubkey] = {
               numTxs: 0,
               lastTxDate: new Date(0),
               totalTxAmountCents: 0,
            };
         }

         if (tx.status === TxStatus.PAID) {
            acc[contact.pubkey].numTxs++;
            acc[contact.pubkey].totalTxAmountCents += tx.amount;
            acc[contact.pubkey].lastTxDate = new Date(tx.date);
         }

         return acc;
      }, {} as ContactTxDataRecord);

      const otherContacts = contacts.filter(c => !Object.keys(contactTxData).includes(c.pubkey));

      return { contactTxData, otherContacts };
   }, [contacts, transactionsToPubkey]);

   const calculateContactScore = (data: ContactTxData) => {
      const { numTxs, lastTxDate, totalTxAmountCents } = data;

      const baseScore = numTxs;

      const now = new Date();
      const daysSinceLastTx = Math.round(
         (now.getTime() - lastTxDate.getTime()) / 1000 / 60 / 60 / 24,
      );

      const timeDecay = Math.max(0, 1 - daysSinceLastTx / 30);

      const amountBonus = Math.min(5, Math.round(totalTxAmountCents / 1000));

      return baseScore * timeDecay + amountBonus;
   };

   const topContacts = useMemo(() => {
      const scores = Object.entries(contactTxData).map(([pubkey, data]) => {
         return {
            pubkey,
            score: calculateContactScore(data),
         };
      });

      scores.sort((a, b) => b.score - a.score);

      return scores.map(c => contacts.find(contact => contact.pubkey === c.pubkey)!);
   }, [contactTxData]);

   const sortedContacts = useMemo(() => {
      return [...topContacts, ...otherContacts];
   }, [topContacts, otherContacts]);

   const fetchContactFromServer = async ({
      pubkey,
      username,
   }: {
      pubkey?: string;
      username?: string;
   }) => {
      let res;
      if (pubkey) {
         res = await fetch(`/api/users/pubkey/${pubkey}`);
      } else if (username) {
         res = await fetch(`/api/users/username/${username}`);
      } else {
         throw new Error('fetch by username or pubkey');
      }

      if (res.status === 200) {
         const contact = (await res.json()) as PublicContact;
         return contact;
      }

      return null;
   };

   const fetchContactByUsername = useCallback(
      async (username: string) => {
         let contact = contacts.find(c => c.username === username) || null;

         if (!contact) {
            contact = await fetchContactFromServer({ username });
         }

         return contact;
      },
      [contacts],
   );

   const fetchContact = useCallback(
      async (pubkey: string) => {
         let contact = contacts.find(c => c.pubkey === pubkey) || null;

         if (!contact) {
            contact = await fetchContactFromServer({ pubkey });
         }

         return contact;
      },
      [contacts],
   );

   const addContact = useCallback(
      async (user: PublicContact) => {
         const localPubkey = window.localStorage.getItem('pubkey');
         if (user.pubkey === localPubkey) {
            throw new Error('You cannot add yourself as a contact');
         }

         const res = await fetch(`/api/users/${localPubkey}`, {
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               linkedUserPubkey: user.pubkey,
            } as ContactData),
         });

         if (!res.ok) {
            if (res.status === 409) {
               throw new Error('Contact already added');
            } else {
               throw new Error('Failed to add contact');
            }
         }

         dispatch(addContactAction(user));
      },
      [dispatch],
   );

   const isContactAdded = useCallback(
      ({ pubkey, username }: { pubkey?: string; username?: string }) => {
         return contacts.find(c => c.pubkey === pubkey || c.username === username) !== undefined;
      },
      [contacts],
   );

   return { fetchContact, sortedContacts, addContact, fetchContactByUsername, isContactAdded };
};

export default useContacts;

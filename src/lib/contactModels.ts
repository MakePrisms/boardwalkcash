import { PublicContact } from '@/types';
import prisma from './prisma';

const findContactByUsername = async (username: string): Promise<PublicContact | null> => {
   const contact = await prisma.user.findUnique({
      where: { username },
      select: {
         username: true,
         pubkey: true,
         createdAt: true,
         lud16: true,
         defaultMintUrl: true,
         mintlessReceive: true,
         defaultUnit: true,
      },
   });
   if (!contact) return null;
   return { ...contact, defaultUnit: contact.defaultUnit as 'usd' | 'sat' };
};

const findContactByPubkey = async (pubkey: string): Promise<PublicContact | null> => {
   const contact = await prisma.user.findUnique({
      where: { pubkey },
      select: {
         username: true,
         pubkey: true,
         createdAt: true,
         lud16: true,
         defaultMintUrl: true,
         mintlessReceive: true,
         defaultUnit: true,
      },
   });
   return contact ? { ...contact, defaultUnit: contact.defaultUnit as 'usd' | 'sat' } : null;
};

const isContactsTrustedMint = async (contact: PublicContact, mintUrl: string) => {
   const contactsTrustedMint = await prisma.user.findUnique({
      where: { pubkey: contact.pubkey },
      select: {
         defaultMint: true,
      },
   });

   if (!contactsTrustedMint) return false;

   return contactsTrustedMint.defaultMint.url === mintUrl;
};

const findManyContacts = async (pubkeys: string[]) => {
   const contacts = await prisma.user.findMany({
      where: { pubkey: { in: pubkeys } },
      select: {
         username: true,
         pubkey: true,
         createdAt: true,
         lud16: true,
         defaultMintUrl: true,
         mintlessReceive: true,
         defaultUnit: true,
      },
   });
   return contacts.map(c => ({
      ...c,
      defaultUnit: c.defaultUnit as 'usd' | 'sat',
   }));
};

export { findContactByUsername, findContactByPubkey, isContactsTrustedMint, findManyContacts };

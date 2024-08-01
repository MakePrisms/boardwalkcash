import { PublicContact } from '@/types';
import prisma from './prisma';

const findContactByUsername = async (username: string): Promise<PublicContact | null> => {
   const contact = await prisma.user.findUnique({
      where: { username },
      select: {
         username: true,
         pubkey: true,
         createdAt: true,
      },
   });
   return contact;
};

const findContactByPubkey = async (pubkey: string): Promise<PublicContact | null> => {
   const contact = await prisma.user.findUnique({
      where: { pubkey },
      select: {
         username: true,
         pubkey: true,
         createdAt: true,
      },
   });
   return contact;
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
      },
   });
   return contacts;
};

export { findContactByUsername, findContactByPubkey, isContactsTrustedMint, findManyContacts };

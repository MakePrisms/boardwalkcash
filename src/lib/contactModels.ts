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

export { findContactByUsername, findContactByPubkey };

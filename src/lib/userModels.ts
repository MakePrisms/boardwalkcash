import { Mint } from '@prisma/client';
import { findOrCreateMint } from './mintModels';
import prisma from '@/lib/prisma';

async function createUser(pubkey: string, defaultMint: Mint, username?: string) {
   const user = await prisma.user.create({
      data: {
         pubkey,
         username,
         defaultMint: {
            connect: {
               url: defaultMint.url,
            },
         },
      },
   });
   return user;
}

async function findUserById(id: number) {
   const user = await prisma.user.findUnique({
      where: {
         id,
      },
   });
   return user;
}

async function findUserByPubkey(pubkey: string) {
   const user = await prisma.user.findUnique({
      where: {
         pubkey,
      },
      include: {
         contacts: {
            select: { user: { select: { pubkey: true, username: true } } },
         },
      },
   });
   return user;
}

async function findUserByPubkeyWithMint(pubkey: string) {
   const user = await prisma.user.findUnique({
      where: {
         pubkey,
      },
      include: {
         defaultMint: {
            include: {
               keysets: true,
            },
         },
      },
   });
   return user;
}

async function updateUser(
   pubkey: string,
   updates: { username?: string; receiving?: boolean; mintUrl?: string },
) {
   let defaultMint;
   if (updates.mintUrl) {
      const mintLocal = await findOrCreateMint(updates.mintUrl);

      delete updates.mintUrl;

      defaultMint = {
         connect: {
            url: mintLocal.url,
         },
      };
   }

   const payload: any = {
      ...updates,
   };

   if (defaultMint) {
      payload.defaultMint = defaultMint;
   }

   const user = await prisma.user.update({
      where: {
         pubkey,
      },
      data: payload,
   });
   return user;
}

async function deleteUser(id: number) {
   const user = await prisma.user.delete({
      where: {
         id,
      },
   });
   return user;
}

interface ContactData {
   nickname?: string;
   phoneNumber?: string;
   email?: string;
   xHandle?: string;
   linkedUserPubkey?: string;
}

async function addContactToUser(userPubkey: string, contactData: ContactData) {
   try {
      const newContact = await prisma.contact.create({
         data: {
            nickname: contactData.nickname,
            phoneNumber: contactData.phoneNumber,
            email: contactData.email,
            xHandle: contactData.xHandle,
            user: {
               connect: { pubkey: userPubkey },
            },
            linkedUser: contactData.linkedUserPubkey
               ? { connect: { pubkey: contactData.linkedUserPubkey } }
               : undefined,
         },
         include: {
            user: {
               select: { pubkey: true, username: true },
            },
            linkedUser: {
               select: { pubkey: true, username: true },
            },
         },
      });

      return newContact;
   } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
   }
}
export {
   createUser,
   findUserById,
   findUserByPubkey,
   findUserByPubkeyWithMint,
   updateUser,
   deleteUser,
   addContactToUser,
};

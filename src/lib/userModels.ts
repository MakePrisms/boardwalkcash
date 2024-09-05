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
            select: { linkedUser: { select: { pubkey: true, username: true, nostrPubkey: true } } },
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
   updates: { username?: string; receiving?: boolean; mintUrl?: string; nostrPubkey?: string },
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

export interface ContactData {
   nickname?: string;
   phoneNumber?: string;
   email?: string;
   xHandle?: string;
   linkedUserPubkey?: string;
}

async function addContactToUser(userPubkey: string, contactData: ContactData) {
   if (!userPubkey || !contactData.linkedUserPubkey) {
      throw new Error('Missing required parameters');
   }
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

const getManyUsersByNostrPubkey = async (pubkeys: string[]) => {
   return prisma.user.findMany({
      where: {
         nostrPubkey: {
            in: pubkeys,
         },
      },
      select: {
         pubkey: true,
         username: true,
         nostrPubkey: true,
      },
   });
};

const removeContactFromUser = async (pubkey: string, contactPubkey: string) => {
   const contact = await prisma.contact.findFirst({
      where: {
         userId: pubkey,
         linkedUserId: contactPubkey,
      },
   });

   console.log('deleting contact', contact);

   if (!contact) {
      throw new Error('Contact not found');
   }

   // Delete the contact record
   await prisma.contact.delete({
      where: {
         id: contact.id,
      },
   });

   await prisma.contact.deleteMany({
      where: {
         userId: contactPubkey,
         linkedUserId: pubkey,
      },
   });
};

export {
   createUser,
   findUserById,
   findUserByPubkey,
   findUserByPubkeyWithMint,
   updateUser,
   deleteUser,
   addContactToUser,
   getManyUsersByNostrPubkey,
   removeContactFromUser,
};

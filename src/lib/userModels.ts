import { Mint, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createUser(pubkey: string, defaultMint: Mint) {
   const user = await prisma.user.create({
      data: {
         pubkey,
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

async function updateUser(pubkey: string, updates: { username?: string; receiving?: boolean }) {
   const user = await prisma.user.update({
      where: {
         pubkey,
      },
      data: {
         ...updates,
      },
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

export {
   createUser,
   findUserById,
   findUserByPubkey,
   findUserByPubkeyWithMint,
   updateUser,
   deleteUser,
};

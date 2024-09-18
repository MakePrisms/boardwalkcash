import { PrismaClient } from '@prisma/client';
import { NextApiRequest } from 'next';

declare global {
   var prisma: PrismaClient | undefined;

   interface NextApiRequest {
      authenticatedPubkey?: string;
   }
}

export {};

import { PrismaClient } from '@prisma/client';

declare module 'light-bolt11-decoder';

declare global {
   var prisma: PrismaClient;
}

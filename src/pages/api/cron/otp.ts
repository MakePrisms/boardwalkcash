import prisma from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

const deleteExpiredOtps = async () => {
   const fiveMinutesAgo = new Date(new Date().getTime() - 5 * 60 * 1000);

   const otps = await prisma.pendingOtp.findMany({
      where: {
         createdAt: {
            lt: fiveMinutesAgo,
         },
      },
   });

   for (const otp of otps) {
      await prisma.pendingOtp.delete({
         where: {
            id: otp.id,
         },
      });
   }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await deleteExpiredOtps();

   res.status(200).send('Done');
}

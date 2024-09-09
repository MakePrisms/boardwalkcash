import prisma from './prisma';

export const generateOtp = async (nostrPubkey: string, boardwalkPubkey: string) => {
   /* generate a random number between 100000 and 1000000 */
   const otp = Math.floor(100000 + Math.random() * 900000).toString(10);

   return prisma.pendingOtp.create({
      data: {
         userPubkey: boardwalkPubkey,
         nostrPubkey,
         otpCode: otp,
      },
   });
};

export const getPendingOtp = async (otp: string) => {
   return prisma.pendingOtp.findUnique({
      where: {
         otpCode: otp,
      },
   });
};

export const deleteOtp = async (otp: string) => {
   return prisma.pendingOtp.delete({
      where: {
         otpCode: otp,
      },
   });
};

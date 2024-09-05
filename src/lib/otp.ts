import prisma from './prisma';

export const generateOtp = async (nostrPubkey: string, boardwalkPubkey: string) => {
   const otp = Math.floor(Math.random() * 1000000).toString(10);

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

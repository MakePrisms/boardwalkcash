const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const deleteUser = async username => {
   try {
      const user = await prisma.user.findUnique({
         where: {
            username: username,
         },
      });
      await prisma.contact.deleteMany({
         where: { OR: [{ userId: user.pubkey }, { linkedUserId: user.pubkey }] },
      });
      await prisma.proof.deleteMany({ where: { userId: user.id } });
      await prisma.mintQuote.deleteMany({ where: { pubkey: user.pubkey } });
      await prisma.notification.deleteMany({ where: { userPubkey: user.pubkey } });
      // await prisma.gift.deleteMany({ where: { creatorId: user.id } });

      // Delete the user
      await prisma.user.delete({ where: { id: user.id } });
      console.log('User deleted:', user);
   } catch (error) {
      console.error('Error deleting user:', error);
   } finally {
      await prisma.$disconnect();
   }
};

const username = process.argv[2];
deleteUser(username);

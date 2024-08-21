const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function getMetrics(startDate, endDate) {
   try {
      // Total number of users
      const totalUsers = await prisma.user.count({
         where: {
            createdAt: { gte: startDate, lte: endDate },
         },
      });

      // Users with usernames
      const usersWithUsernames = await prisma.user.findMany({
         where: {
            username: { not: null },
            createdAt: { gte: startDate, lte: endDate },
         },
      });
      const customUsernameCount = usersWithUsernames.filter(
         u => !u.username?.includes('user-'),
      ).length;

      // Total number of contacts
      const totalContacts = await prisma.contact.count({
         where: {
            createdAt: { gte: startDate, lte: endDate },
         },
      });

      // Average contacts per user (for users created in this period)
      const avgContactsPerUser = totalContacts / totalUsers || 0;

      // Number of mint quotes
      const totalMintQuotes = await prisma.mintQuote.count({
         where: {
            createdAt: { gte: startDate, lte: endDate },
         },
      });

      // Number of paid mint quotes
      const paidMintQuotes = await prisma.mintQuote.count({
         where: {
            paid: true,
            createdAt: { gte: startDate, lte: endDate },
         },
      });

      // Number of mints (assuming Mint model has a createdAt field)
      const totalMints = await prisma.mint.count();

      // Log all metrics at the end
      console.log(`\n======================`);
      console.log(
         `Metrics from ${startDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} to ${endDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`,
      );
      console.log(`New Users: ${totalUsers}`);
      console.log(`New Users w/custom username: ${customUsernameCount}`);
      console.log(`New Contacts: ${totalContacts}`);
      console.log(`Average Contacts per New User: ${avgContactsPerUser.toFixed(2)}`);
      console.log(`New Mint Quotes: ${totalMintQuotes}`);
      console.log(`New Paid Mint Quotes: ${paidMintQuotes}`);
      console.log(`Total Mints: ${totalMints}`);
      console.log(`======================\n`);

      // // Total notifications
      // const totalNotifications = await prisma.notification.count({
      //    where: {
      //       createdAt: { gte: startDate, lte: endDate },
      //    },
      // });
      // console.log(`New Notifications: ${totalNotifications}`);

      // // Unread notifications
      // const unreadNotifications = await prisma.notification.count({
      //    where: {
      //       isRead: false,
      //       createdAt: { gte: startDate, lte: endDate },
      //    },
      // });
      // console.log(`New Unread Notifications: ${unreadNotifications}`);
   } catch (error) {
      console.error('Error fetching metrics:', error);
   } finally {
      await prisma.$disconnect();
   }
}

// Example usage:
const endDate = new Date(); // Current date and time
const startDate = new Date(endDate);
startDate.setDate(endDate.getDate() - 3);
getMetrics(startDate, endDate);

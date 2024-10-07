const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const asciichart = require('asciichart');
const fs = require('fs');
const { getDecodedToken } = require('@cashu/cashu-ts');

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

      const lockedTokens = await prisma.token.findMany({
         where: { createdAt: { gte: startDate, lte: endDate } },
      });

      const tokenData = lockedTokens
         .map(t => {
            const { token, createdByPubkey, recipientPubkey } = t;
            const decoded = getDecodedToken(token);
            const amountCents = decoded.token[0].proofs.reduce((acc, p) => acc + p.amount, 0);
            const mintUrl = decoded.token[0].mint;
            if (mintUrl.includes('test')) return null;
            const gift = t.gift;
            return {
               lockedTo: recipientPubkey,
               amountCents,
               mintUrl,
               gift,
               createdByPubkey,
            };
         })
         .filter(t => t !== null);

      const { totalETips, eTipDollarValue } = tokenData.reduce(
         (acc, t) => {
            if (t.gift === null) {
               acc.totalETips += 1;
               acc.eTipDollarValue += t.amountCents;
            }
            return acc;
         },
         { totalETips: 0, eTipDollarValue: 0 },
      );
      const { totalEGifts, eGiftDollarValue } = tokenData.reduce(
         (acc, t) => {
            if (t.gift !== null) {
               acc.totalEGifts += 1;
               acc.eGiftDollarValue += t.amountCents;
            }
            return acc;
         },
         { totalEGifts: 0, eGiftDollarValue: 0 },
      );
      const { totalFees, feeDollarValue } = tokenData.reduce(
         (acc, t) => {
            if (t.isFee) {
               acc.totalFees += 1;
               acc.feeDollarValue += t.amountCents;
            }
            return acc;
         },
         { totalFees: 0, feeDollarValue: 0 },
      );

      console.log('tokenData', tokenData);

      const topGiftSender = tokenData.reduce((acc, t) => {
         if (!acc[t.createdByPubkey]) {
            acc[t.createdByPubkey] = 0;
         }
         acc[t.createdByPubkey] += 1;
         return acc;
      }, {});

      console.log('Gifts sent by: ', topGiftSender);

      const topGiftReceiver = tokenData.reduce((acc, t) => {
         if (!acc[t.lockedTo]) {
            acc[t.lockedTo] = 0;
         }
         acc[t.lockedTo] += 1;
         return acc;
      }, {});

      console.log('Number of gifts received by: ', topGiftReceiver);

      // // Number of mint quotes
      // const totalMintQuotes = await prisma.mintQuote.count({
      //    where: {
      //       createdAt: { gte: startDate, lte: endDate },
      //    },
      // });

      // // Number of paid mint quotes
      // const paidMintQuotes = await prisma.mintQuote.count({
      //    where: {
      //       paid: true,
      //       createdAt: { gte: startDate, lte: endDate },
      //    },
      // });

      // // Number of mints (assuming Mint model has a createdAt field)
      // const totalMints = await prisma.mint.count();

      // // Log all metrics at the end
      // console.log(`\n======================`);
      // console.log(
      //    `Metrics from ${startDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} to ${endDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`,
      // );
      // console.log(`New Users: ${totalUsers}`);
      // console.log(`New Users w/custom username: ${customUsernameCount}`);
      // console.log(`New Contacts: ${totalContacts}`);
      // console.log(`Average Contacts per New User: ${avgContactsPerUser.toFixed(2)}`);
      // console.log(`New Mint Quotes: ${totalMintQuotes}`);
      // console.log(`New Paid Mint Quotes: ${paidMintQuotes}`);
      // console.log(`Total Mints: ${totalMints}`);
      // console.log(`======================\n`);
      return {
         date: endDate,
         newUsers: totalUsers,
         customUsernameCount,
         newContacts: totalContacts,
         avgContactsPerUser: parseFloat(avgContactsPerUser.toFixed(2)),
         totalETips,
         eTipDollarValue: parseFloat((eTipDollarValue / 100).toFixed(2)),
         totalEGifts,
         eGiftDollarValue: parseFloat((eGiftDollarValue / 100).toFixed(2)),
         totalFees,
         feeDollarValue: parseFloat((feeDollarValue / 100).toFixed(2)),
         // newMintQuotes: totalMintQuotes,
         // newPaidMintQuotes: paidMintQuotes,
         // totalMints,
      };
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

const getMintMetics = async () => {
   const users = await prisma.user.findMany();

   const defaultMintsCount = users.reduce((acc, user) => {
      if (user.defaultMintUrl) {
         if (!acc[user.defaultMintUrl]) {
            acc[user.defaultMintUrl] = 0;
         }
         acc[user.defaultMintUrl] = (acc[user.defaultMintUrl] || 0) + 1;
      }
      return acc;
   }, {});

   console.log('defaultMintsCount', defaultMintsCount);

   const defaultMints = Object.keys(defaultMintsCount).map(url => ({
      url,
      count: defaultMintsCount[url],
   }));

   console.log('defaultMints', defaultMints);
};

async function deleteOurMints() {
   const toDelete = [
      'https://mint.boardwalkcash.com',
      'https://mint.peerreserve.com',
      'https://mint.bitcoinmints.com',
   ];

   const mints = await prisma.mint.findMany();

   const mintsToDelete = mints.filter(mint => toDelete.some(url => mint.url.includes(url)));

   console.log('Mints to delete:', mintsToDelete);

   for (const mint of mintsToDelete) {
      if (
         mint.url.includes('test') ||
         mint.url.includes('stablenut') ||
         mint.url.includes('mint.lnvoltz.com')
      ) {
         throw new Error('OOps');
      }
      console.log(`Deleting mint: ${mint.url}`);

      // Find users associated with this mint
      const usersToDelete = await prisma.user.findMany({
         where: { defaultMintUrl: mint.url },
      });

      usersToDelete.forEach(user => {
         if (user.username) throw new Error('OOps');
      });

      for (const user of usersToDelete) {
         console.log(`Deleting user: ${user.pubkey}`);
         // Delete user's associated data
         await prisma.contact.deleteMany({
            where: { OR: [{ userId: user.pubkey }, { linkedUserId: user.pubkey }] },
         });
         await prisma.proof.deleteMany({ where: { userId: user.id } });
         await prisma.mintQuote.deleteMany({ where: { pubkey: user.pubkey } });
         await prisma.notification.deleteMany({ where: { userPubkey: user.pubkey } });
         // await prisma.gift.deleteMany({ where: { creatorId: user.id } });

         // Delete the user
         await prisma.user.delete({ where: { id: user.id } });
      }

      // Delete associated MintKeysets
      try {
         await prisma.mintKeyset.deleteMany({
            where: { mintUrl: mint.url },
         });
      } catch (e) {
         console.error('Error deleting mint keysets', e);
      }

      // Delete the Mint
      try {
         await prisma.mint.delete({
            where: { url: mint.url },
         });
      } catch (e) {
         console.error('Error deleting mint', e);
      }
   }

   console.log('Deletion process completed.');
}

async function generateTerminalGraph(data) {
   const endDate = new Date();
   // const data = [];

   // for (let i = 0; i < days; i++) {
   //    const startDate = new Date(endDate);
   //    startDate.setDate(endDate.getDate() - 1);
   //    console.log(`\n${startDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`);
   //    const metrics = await getMetrics(startDate, endDate);
   //    data.unshift(metrics);
   //    endDate.setDate(endDate.getDate() - 1);
   // }

   const config = {
      height: 20,
      colors: [asciichart.blue, asciichart.green, asciichart.yellow, asciichart.red],
   };

   console.log('New Users:');
   console.log(
      asciichart.plot(
         data.map(d => d.newUsers),
         config,
      ),
   );

   console.log('\nNew Users w/custom username:');
   console.log(
      asciichart.plot(
         data.map(d => d.customUsernameCount),
         config,
      ),
   );

   console.log('\nNew Contacts:');
   console.log(
      asciichart.plot(
         data.map(d => d.newContacts),
         config,
      ),
   );

   // Add more graphs for other metrics as needed
}

async function batchGetMetrics(days = 30) {
   const endDate = new Date();
   const data = [];
   const batchSize = 5;
   const batches = Math.ceil(days / batchSize);

   for (let batch = 0; batch < batches; batch++) {
      const batchPromises = [];
      for (let i = 0; i < batchSize && batch * batchSize + i < days; i++) {
         const currentEndDate = new Date(endDate);
         currentEndDate.setDate(endDate.getDate() - (batch * batchSize + i));
         const currentStartDate = new Date(currentEndDate);
         currentStartDate.setDate(currentEndDate.getDate() - 1);

         batchPromises.push(getMetrics(currentStartDate, currentEndDate));
      }

      const batchResults = await Promise.all(batchPromises);
      data.unshift(...batchResults);
   }

   return data.sort((a, b) => a.date.getTime() - b.date.getTime());
}

async function generateHTMLGraph(data) {
   const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <title>Metrics Graph</title>
   <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
   <canvas id="metricsChart" width="800" height="400"></canvas>
   <script>
   const ctx = document.getElementById('metricsChart').getContext('2d');
   new Chart(ctx, {
      type: 'line',
      data: {
         labels: ${JSON.stringify(data.map(d => d.date.toISOString().split('T')[0]))},
         datasets: [
            {
               label: 'New Users',
               data: ${JSON.stringify(data.map(d => d.newUsers))},
               borderColor: 'blue',
               fill: false
            },
            {
               label: 'New Users w/custom username',
               data: ${JSON.stringify(data.map(d => d.customUsernameCount))},
               borderColor: 'yellow',
               fill: false
            },
            {
               label: 'New Contacts',
               data: ${JSON.stringify(data.map(d => d.newContacts))},
               borderColor: 'green',
               fill: false
            },
            // Add more datasets for other metrics
         ]
      },
      options: {
         responsive: true,
         title: {
            display: true,
            text: 'Metrics Over Time'
         },
         scales: {
            x: {
               display: true,
               title: {
                  display: true,
                  text: 'Date'
               }
            },
            y: {
               display: true,
               title: {
                  display: true,
                  text: 'Value'
               }
            }
         }
      }
   });
   </script>
</body>
</html>
   `;

   fs.writeFileSync('metrics_graph.html', htmlContent);
   console.log('HTML graph generated: metrics_graph.html');
}

function generateCSV(data) {
   const headers = [
      'Date',
      'New Users',
      'Custom Username Count',
      'New Contacts',
      'Avg Contacts per User',
      'eTips',
      'eTip Value $',
      'eGifts',
      'eGift Value $',
      'Fees',
      'Fee Value $',
   ];

   const csvRows = [
      headers.join(','),
      ...data.map(row =>
         [
            row.date.toISOString().split('T')[0],
            row.newUsers,
            row.customUsernameCount,
            row.newContacts,
            row.avgContactsPerUser,
            row.totalETips,
            row.eTipDollarValue,
            row.totalEGifts,
            row.eGiftDollarValue,
            row.totalFees,
            row.feeDollarValue,
         ].join(','),
      ),
   ];

   const csvContent = csvRows.join('\n');

   fs.writeFileSync('metrics.csv', csvContent);
   console.log('CSV file generated: metrics.csv');
}

// Example usage:
// const endDate = new Date(); // Current date and time
// const startDate = new Date(endDate);
// startDate.setDate(endDate.getDate() - 3);
// getMetrics(startDate, endDate);
// generateTerminalGraph(30);
batchGetMetrics(8).then(datasets => {
   // generateHTMLGraph(datasets);
   // generateTerminalGraph(datasets);
   generateCSV(datasets);
});
// generateTerminalGraph(datasets);
// generateHTMLGraph(datasets);
// getMintMetics();
// deleteOurMints();

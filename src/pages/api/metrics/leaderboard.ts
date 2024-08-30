import { GiftMetrics, LeaderboardResponse } from '@/types';
import prisma from '../../../lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { getDecodedToken } from '@cashu/cashu-ts';

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse<LeaderboardResponse | { error: string }>,
) {
   if (req.method === 'GET') {
      try {
         const gifts = await prisma.token.findMany({
            where: {
               gift: {
                  not: null,
               },
            },
            include: {
               recipient: true,
               createdBy: true,
            },
         });
         /* count of gifts sent by each pubkey */
         const senderMetrics = gifts.reduce(
            (acc, t) => {
               if (t.createdByPubkey === null) return acc;
               if (t.createdByPubkey === t.recipientPubkey) return acc;
               if (!acc[t.createdByPubkey]) {
                  acc[t.createdByPubkey] = {
                     total: 0,
                     giftCount: {},
                     totalAmountCents: 0,
                     username: t.createdBy?.username!,
                  };
               }
               const tokenAmountCents = getDecodedToken(t.token).token[0].proofs.reduce(
                  (acc, p) => acc + p.amount,
                  0,
               );
               acc[t.createdByPubkey].total += 1;
               acc[t.createdByPubkey].totalAmountCents += tokenAmountCents;

               if (!acc[t.createdByPubkey].giftCount[t.gift!]) {
                  acc[t.createdByPubkey].giftCount[t.gift!] = 0;
               }
               acc[t.createdByPubkey].giftCount[t.gift!] += 1;
               return acc;
            },
            {} as Record<string, GiftMetrics>,
         );

         /* count of gifts received by each pubkey */
         const receiverMetrics = gifts.reduce(
            (acc, t) => {
               if (t.recipientPubkey === null) return acc;
               if (t.createdByPubkey === t.recipientPubkey) return acc;

               if (!acc[t.recipientPubkey]) {
                  acc[t.recipientPubkey] = {
                     total: 0,
                     giftCount: {},
                     totalAmountCents: 0,
                     username: t.recipient?.username || '',
                  };
               }
               const tokenAmountCents = getDecodedToken(t.token).token[0].proofs.reduce(
                  (acc, p) => acc + p.amount,
                  0,
               );
               acc[t.recipientPubkey].total += 1;
               acc[t.recipientPubkey].totalAmountCents += tokenAmountCents;

               if (!acc[t.recipientPubkey].giftCount[t.gift!]) {
                  acc[t.recipientPubkey].giftCount[t.gift!] = 0;
               }
               acc[t.recipientPubkey].giftCount[t.gift!] += 1;
               return acc;
            },
            {} as Record<string, GiftMetrics>,
         );

         // Sort senderMetrics in descending order
         const sortedSenderMetrics = Object.entries(senderMetrics)
            .sort(([, a], [, b]) => b.total - a.total)
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

         // Sort receiverMetrics in descending order
         const sortedReceiverMetrics = Object.entries(receiverMetrics)
            .sort(([, a], [, b]) => b.total - a.total)
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

         res.status(200).json({
            senderMetrics: sortedSenderMetrics,
            receiverMetrics: sortedReceiverMetrics,
         });
      } catch (error) {
         console.error('Error fetching leaderboard data:', error);
         res.status(500).json({ error: 'An error occurred while fetching leaderboard data' });
      } finally {
         await prisma.$disconnect();
      }
   } else {
      res.status(405).json({ error: 'Method not allowed' });
   }
}

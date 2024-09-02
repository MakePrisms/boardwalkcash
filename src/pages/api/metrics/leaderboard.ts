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
         const { periods } = req.query;
         const timePeriods = (periods as string).split(',').map(p => p.trim());

         const maxPeriod = Math.max(...timePeriods.map(getPeriodInHours));
         const sinceDate = new Date(Date.now() - maxPeriod * 60 * 60 * 1000);

         const gifts = await prisma.token.findMany({
            where: {
               gift: {
                  not: null,
               },
               createdAt: {
                  gte: sinceDate,
               },
            },
            include: {
               recipient: true,
               createdBy: true,
            },
         });

         const result: {
            [timePeriod: string]: {
               senderMetrics: Record<string, GiftMetrics>;
               receiverMetrics: Record<string, GiftMetrics>;
            };
         } = {};

         for (const period of timePeriods) {
            const periodInHours = getPeriodInHours(period);
            const periodDate = new Date(Date.now() - periodInHours * 60 * 60 * 1000);

            const filteredGifts = gifts.filter(g => g.createdAt >= periodDate);

            const senderMetrics = calculateMetrics(filteredGifts, 'sender');
            const receiverMetrics = calculateMetrics(filteredGifts, 'receiver');

            result[period] = {
               senderMetrics: sortMetrics(senderMetrics),
               receiverMetrics: sortMetrics(receiverMetrics),
            };
         }

         res.status(200).json(result);
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

function getPeriodInHours(period: string): number {
   switch (period) {
      case '24hr':
         return 24;
      case '7d':
         return 7 * 24;
      default:
         throw new Error(`Invalid period: ${period}`);
   }
}

function calculateMetrics(gifts: any[], type: 'sender' | 'receiver'): Record<string, GiftMetrics> {
   return gifts.reduce(
      (acc, t) => {
         const pubkey = type === 'sender' ? t.createdByPubkey : t.recipientPubkey;
         const otherPubkey = type === 'sender' ? t.recipientPubkey : t.createdByPubkey;

         if (pubkey === null || pubkey === otherPubkey) return acc;

         if (!acc[pubkey]) {
            acc[pubkey] = {
               total: 0,
               giftCount: {},
               totalAmountCents: 0,
               username: type === 'sender' ? t.createdBy?.username! : t.recipient?.username || '',
            };
         }

         const tokenAmountCents = getDecodedToken(t.token).token[0].proofs.reduce(
            (sum, p) => sum + p.amount,
            0,
         );

         acc[pubkey].total += 1;
         acc[pubkey].totalAmountCents += tokenAmountCents;

         if (!acc[pubkey].giftCount[t.gift!]) {
            acc[pubkey].giftCount[t.gift!] = 0;
         }
         acc[pubkey].giftCount[t.gift!] += 1;

         return acc;
      },
      {} as Record<string, GiftMetrics>,
   );
}

function sortMetrics(metrics: Record<string, GiftMetrics>): Record<string, GiftMetrics> {
   return Object.entries(metrics)
      .sort(([, a], [, b]) => b.total - a.total)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
}

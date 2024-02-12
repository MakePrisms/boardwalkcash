import axios from 'axios';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runMiddleware, corsMiddleware } from "@/utils/middleware";
import { CashuMint, CashuWallet } from "@cashu/cashu-ts";
import { createProof } from '@/lib/proofModels';
import { findUserByPubkey } from '@/lib/userModels';

interface PollingRequest {
  pubkey: string;
  hash: string;
  amount: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const wallet = new CashuWallet(new CashuMint(process.env.CASHU_MINT_URL!));

  const { pubkey, hash, amount }: PollingRequest = req.body;

  const checkPaymentStatus = async (hash: string) => {
    const response = await axios.get(`https://8333.space:3338/v1/mint/quote/bolt11/${hash}`);
    console.log('Payment status response:', response.data);
    return response.data; // Adjust based on actual API response
  };

  const notifyPaymentSuccess = async (pubkey: string, paymentDetails: any) => {
    await axios.post(`/api/proofs/paid/${pubkey}`, paymentDetails);
  };

  try {
    let paymentConfirmed = false;
    const maxAttempts = 60;
    let attempts = 0;
    let interval = 2000;

    console.time("PollingDuration"); // Start the timer

    while (!paymentConfirmed && attempts < maxAttempts) {
      const status = await checkPaymentStatus(hash);
      console.log("polling", attempts);
      if (status.paid) { // Adjust based on actual response property

        paymentConfirmed = true;

        const { proofs } = await wallet.requestTokens(amount, hash);

        const user = await findUserByPubkey(pubkey);

        if (!user) {
          res.status(404).send({ success: false, message: 'User not found.' });
          return;
        }

        proofs.forEach(async (proof) => {
            await createProof(proof.id, proof.amount, proof.secret, proof.C, user.id );
        })

        break;
      } else {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, interval));
        interval += 500;
      }
    }

    console.timeEnd("PollingDuration"); // End the timer and log the duration

    if (!paymentConfirmed) {
      res.status(408).send({ success: false, message: 'Payment confirmation timeout.' });
    }
  } catch (error) {
    console.error('Error during payment status check:', error);
    res.status(500).send({ success: false, message: 'Internal server error.' });
  }
};

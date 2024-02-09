import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';
import { runMiddleware, corsMiddleware } from "@/utils/middleware"; // Import the CORS middleware

interface PollingRequest {
  pubkey: string;
  quote: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Here we use the CORS middleware
  await runMiddleware(req, res, corsMiddleware);

  const { pubkey, quote }: PollingRequest = req.body;

  const checkPaymentStatus = async (quote: string) => {
    const response = await axios.get(`${process.env.CASHU_MINT_URL}/v1/mint/quote/bolt11/${quote}`);
    console.log('Payment status response:', response.data);
    return response.data; // Adjust based on actual API response
  };

  const notifyPaymentSuccess = async (pubkey: string, paymentDetails: any) => {
    await axios.post(`/api/proofs/paid/${pubkey}`, paymentDetails);
  };

  try {
    let paymentConfirmed = false;
    const maxAttempts = 10;
    let attempts = 0;

    while (!paymentConfirmed && attempts < maxAttempts) {
      const status = await checkPaymentStatus(quote);
      if (status.isPaid) { // Adjust based on actual response property
        paymentConfirmed = true;
        await notifyPaymentSuccess(pubkey, status);
        res.status(200).send({ success: true, message: 'Payment confirmed and notified.' });
        break;
      } else {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds before next attempt
      }
    }

    if (!paymentConfirmed) {
      res.status(408).send({ success: false, message: 'Payment confirmation timeout.' });
    }
  } catch (error) {
    console.error('Error during payment status check:', error);
    res.status(500).send({ success: false, message: 'Internal server error.' });
  }
};

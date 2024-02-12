import axios from 'axios';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CashuMint, CashuWallet } from "@cashu/cashu-ts";
import { createProof } from '@/lib/proofModels';
import { findUserByPubkey } from '@/lib/userModels';

interface PollingRequest {
    pubkey: string;
    amount: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { slug } = req.query;

    // Ensure hash is a string to satisfy TypeScript expectations and function logic
    if (typeof slug !== 'string') {
        res.status(400).send({ success: false, message: 'Invalid hash provided.' });
        return;
    }

    const wallet = new CashuWallet(new CashuMint(process.env.CASHU_MINT_URL!));

    const { pubkey, amount }: PollingRequest = req.body;

    const checkPaymentStatus = async (hash: string) => {
        const response = await axios.get(`https://8333.space:3338/v1/mint/quote/bolt11/${hash}`);
        console.log('Payment status response:', response.data);
        return response.data; // Adjust based on actual API response
    };

    try {
        let paymentConfirmed = false;
        const maxAttempts = 90;
        let attempts = 0;
        let interval = 2000;

        while (!paymentConfirmed && attempts < maxAttempts) {
            const status = await checkPaymentStatus(slug);
            console.log("polling", attempts);
            if (status.paid) { // Adjust based on actual response property

                paymentConfirmed = true;

                const { proofs } = await wallet.requestTokens(amount, slug);

                const user = await findUserByPubkey(pubkey);

                if (!user) {
                    res.status(404).send({ success: false, message: 'User not found.' });
                    return;
                }

                proofs.forEach(async (proof) => {
                    await createProof(proof.id, proof.amount, proof.secret, proof.C, user.id);
                })

                break;
            } else {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, interval));
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

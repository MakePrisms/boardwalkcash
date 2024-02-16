import axios from 'axios';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CashuMint, CashuWallet } from "@cashu/cashu-ts";
import { createManyProofs } from '@/lib/proofModels';
import { findUserByPubkey } from '@/lib/userModels';

interface PollingRequest {
    pubkey: string;
    amount: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { slug } = req.query;

    if (typeof slug !== 'string') {
        res.status(400).send({ success: false, message: 'Invalid hash provided.' });
        return;
    }

    const wallet = new CashuWallet(new CashuMint(process.env.CASHU_MINT_URL!));

    const { pubkey, amount }: PollingRequest = req.body;

    const checkPaymentStatus = async (hash: string) => {
        const response = await axios.get(`https://8333.space:3338/v1/mint/quote/bolt11/${hash}`);
        console.log('Payment status response:', response.data);
        return response.data;
    };

    try {
        let paymentConfirmed = false;
        const maxAttempts = 90;
        let attempts = 0;
        let interval = 2000;

        while (!paymentConfirmed && attempts < maxAttempts) {
            const status = await checkPaymentStatus(slug);
            console.log("polling", attempts);
            if (status.paid) {
                paymentConfirmed = true;

                const { proofs } = await wallet.requestTokens(amount, slug);

                console.log('Proofs:', proofs);

                const user = await findUserByPubkey(pubkey);
                if (!user) {
                    res.status(404).send({ success: false, message: 'User not found.' });
                    return;
                }

                // add user.id as userId to each proof
                // rename proof.id to proof.proofId
                // remove proof.id
                let proofsPayload = proofs.map((proof) => {
                    return {
                        proofId: proof.id,
                        secret: proof.secret,
                        amount: proof.amount,
                        C: proof.C,
                        userId: user.id
                    }
                })

                const created = await createManyProofs(proofsPayload);

                console.log('Proofs created:', created);

                if (!created) {
                    res.status(500).send({ success: false, message: 'Failed to create proofs.' });
                    return;
                }

                res.status(200).send({ success: true, message: 'Payment confirmed and proofs created.' });
                return;

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
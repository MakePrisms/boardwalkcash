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

    try {
        let paymentConfirmed = false;
        const maxAttempts = 90;
        let attempts = 0;
        let interval = 2000;
        
        const user = await findUserByPubkey(pubkey);
        if (!user) {
            res.status(404).send({ success: false, message: 'User not found.' });
            return;
        }

        while (!paymentConfirmed && attempts < maxAttempts) {
            console.log("polling", attempts);
            try {
                const { proofs } = await wallet.requestTokens(amount, slug);
    
                console.log('Proofs:', proofs);
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
            } catch (e) {
                if (e instanceof Error && e.message.includes("not paid")){
                    console.log("quote not paid");
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, interval));
                } else {
                    throw e;
                }
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

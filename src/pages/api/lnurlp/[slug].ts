import { runMiddleware, corsMiddleware } from "@/utils/middleware";
import type { NextApiRequest, NextApiResponse } from "next";
import { findUserByPubkey } from "@/lib/userModels";

const BACKEND_URL = process.env.BACKEND_URL

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, corsMiddleware);

    const { slug } = req.query

    if (!slug || slug === 'undefined') {
        res.status(404).json({ error: 'Not found' })
        return
    }

    // need to get the pubkey from db
    const user = await findUserByPubkey(slug.toString());

    console.log('user in lnurlp', user)

    if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
    }

    if (slug === user.pubkey) {
        const metadata = [
            ["text/plain", "quickcashu lightning address endpoint"]
        ];

        res.status(200).json({ 
            callback: `https://quick-cashu.vercel.app/api/callback/${user.pubkey}`,
            maxSendable: 1000000,
            minSendable: 1000,
            metadata: JSON.stringify(metadata),
            tag: 'payRequest'
        })
        return
    }
}
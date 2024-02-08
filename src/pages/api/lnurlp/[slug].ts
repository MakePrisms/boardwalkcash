import { runMiddleware, corsMiddleware } from "@/utils/middleware";
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.BACKEND_URL

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, corsMiddleware);

    const { slug } = req.query

    if (!slug || slug === 'undefined') {
        res.status(404).json({ error: 'Not found' })
        return
    }

    // need to get the pubkey from db
    const pubkey = "0339f7c"

    if (slug === pubkey) {
        const metadata = [
            ["text/plain", "Sample LN-ADDRESS endpoint"]
        ];

        res.status(200).json({ 
            callback: `${BACKEND_URL}/api/callback/${pubkey}`,
            maxSendable: 1000000,
            minSendable: 1000,
            metadata: JSON.stringify(metadata),
            tag: 'payRequest'
        })
        return
    }
}
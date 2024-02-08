import axios from "axios"
import crypto from "crypto"
import { runMiddleware, corsMiddleware } from "@/utils/middleware";
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.BACKEND_URL

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, corsMiddleware);

    const { slug, ...queryParams } = req.query

    // need to get the pubkey from db
    const pubkey = "0339f7c"

    if (slug === pubkey) {
        // Ensure amount is treated as a string, even if it comes as an array
        const amount = Array.isArray(queryParams.amount) ? queryParams.amount[0] : queryParams.amount;

        if (amount) {
            const metadata = [
                ["text/plain", "Sample LN-ADDRESS endpoint"]
            ];

            const metadataString = JSON.stringify(metadata);

            const hash = crypto.createHash('sha256').update(metadataString).digest('hex');

            const descriptionHash = Buffer.from(hash, 'hex').toString('base64'); // Encoding as base64

            // Convert amount from millisatoshis to satoshis
            const value = parseInt(amount) / 1000;

            if (value < 1) {
                res.status(400).json({ error: 'Amount too low' })
                return
            } else {
                res.status(200).json({ 
                    pr: "exampleinvoice"
                })
            }
        } else {
            res.status(400).json({ error: 'Amount not specified' })
            return
        }
    }
}
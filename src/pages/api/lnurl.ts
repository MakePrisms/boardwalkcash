import type { NextApiRequest, NextApiResponse } from "next";
import { runMiddleware, corsMiddleware } from "@/utils/middleware";

type Data = {
    callback: string;
    maxSendable: number;
    minSendable: number;
    metadata: string;
    tag: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
    await runMiddleware(req, res, corsMiddleware);


    // need to get the pubkey from db
    const pubkey = "0339f7c"

    const metadata = [
        ["text/plain", "Sample LN-ADDRESS endpoint"]
    ];
    const response = {
        // callback refers to the endpoint that will be called by the LNURL server to get the invoice
        // This callback endpoint will be the same one we use for our lightning address
        callback: `${process.env.BACKEND_URL}/api/callback/${pubkey}`,
        maxSendable: 100000000, // milisatoshis
        minSendable: 1000,      // milisatoshis
        metadata: JSON.stringify(metadata),
        tag: "payRequest"
    };
    res.status(200).json(response);
}
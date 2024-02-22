import React, { useState, useEffect } from "react";
import axios from "axios"
import Balance from "@/components/Balance";
import Receive from "@/components/buttons/lightning/Receive";
import Send from "@/components/buttons/lightning/Send";
import EcashButtons from "@/components/buttons/EcashButtons";
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { generateSecretKey, getPublicKey } from 'nostr-tools'
import { useNwc } from "@/hooks/useNwc";
import { useCashu } from "@/hooks/useCashu";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import Disclaimer from "@/components/Disclaimer";
import ActivityIndicator from "@/components/ActivityIndicator";


export default function Home() {

    useEffect(() => {
        // Check for pubkey in local storage
        const storedPrivKey = localStorage.getItem('privkey');

        if (!storedPrivKey) {
            // If no privkey is found, generate a new keypair
            const newSecretKey = generateSecretKey();
            const newPubKey = getPublicKey(newSecretKey)

            // turn the secret key into a hex string
            const sec = new Uint8Array(newSecretKey);
            const newSecretKeyHex = Buffer.from(sec).toString('hex');

            localStorage.setItem('privkey', newSecretKeyHex);
            localStorage.setItem('pubkey', newPubKey);
            
            // save pubkey to db
            // If a new keypair is generated overwrite the old pubkey
            axios.post(`${process.env.NEXT_PUBLIC_PROJECT_URL}/api/users`, {
                pubkey: newPubKey,
            });
        }
    }, []);

    const mint = new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!);

    const wallet = new CashuWallet(mint);

    const balance = useSelector((state: RootState) => state.cashu.balance);

    useNwc();
    useCashu();

    return (
        <main className="flex flex-col items-center justify-center mx-auto min-h-screen">
            <Balance balance={balance} />
            <ActivityIndicator />
            <div className="py-8 w-full">
                <div className="flex flex-row justify-center mx-auto">
                    <Receive />
                    <Send wallet={wallet} />
                </div>
                {/* <EcashButtons wallet={wallet} /> */}
            </div>
            <Disclaimer />
        </main>
    );
}

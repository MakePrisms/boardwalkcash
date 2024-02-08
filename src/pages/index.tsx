import React, { useState, useEffect } from "react";
import Balance from "@/components/Balance";
import LightningButtons from "@/components/buttons/LightningButtons";
import EcashButtons from "@/components/buttons/EcashButtons";
import CreateNwc from "@/components/CreateNwc";
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { generateSecretKey, getPublicKey } from 'nostr-tools'
import { useNwc } from "@/hooks/useNwc";
import { useCashu } from "@/hooks/useCashu";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";


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
            
            // save pubkey to db
            // If a new keypair is generated overwrite the old pubkey
        }
    }, []);

    const wallet = new CashuWallet(new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!));

    const balance = useSelector((state: RootState) => state.cashu.balance);

    useNwc();
    useCashu();

    return (
        <main className="w-full h-full p-4">
            <Balance balance={balance} />
            <div className="py-8">
                <LightningButtons wallet={wallet} />
                {/* <EcashButtons wallet={wallet} /> */}
                {/* <CreateNwc /> */}
            </div>
        </main>
    );
}

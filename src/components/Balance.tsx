import React, { useState, useEffect } from "react";

const Balance = ({ balance }: any) => {
    const [pubkey, setPubkey] = useState<string | null>(null);
    const [nwa, setNwa] = useState<string | null>(null);

    useEffect(() => {
        const storedPubkey = window.localStorage.getItem('pubkey');
        const storedNwa = window.localStorage.getItem('nwa');
        setNwa(storedNwa);
        setPubkey(storedPubkey);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <h1 className="text-3xl font-bold">{balance} sats</h1>
            {pubkey ? <h2>pubkey: {pubkey}</h2> : null}
            {nwa ? <h2>Wallet Connected to Discord Zap Bot</h2> : null}
        </div>
    );
}

export default Balance;

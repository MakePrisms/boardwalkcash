import React from "react";

const Balance = ({ balance }: any) => {
    const pubkey = window.localStorage.getItem('pubkey');

    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <h1 className="text-3xl font-bold">{balance} sats</h1>
            {pubkey ? <h2>pubkey: {pubkey}</h2> : null}
        </div>
    );
}

export default Balance;

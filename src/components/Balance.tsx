import React from "react";

const Balance = ({ balance }: any) => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <h1 className="text-3xl font-bold">{balance} sats</h1>
        </div>
    );
}

export default Balance;

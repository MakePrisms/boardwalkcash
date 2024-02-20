import { Tooltip } from "flowbite-react";
import React, { useState, useEffect } from "react";
import ClipboardButton from "./buttons/CopyButton";

const Balance = ({ balance }: any) => {
  const [lightningAddress, setLightningAddress] = useState<string | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  const [nwa, setNwa] = useState<string | null>(null);

  useEffect(() => {
    const storedPubkey = window.localStorage.getItem("pubkey");
    const storedNwa = window.localStorage.getItem("nwa");
    setNwa(storedNwa);

    if (storedPubkey) {
      const host = window.location.host;
      
      setLightningAddress(`${storedPubkey}@${host}`);
      
      const formattedPubkey = `${storedPubkey.slice(0, 5)}...${storedPubkey.slice(-3)}`;
      setFormattedAddress(`${formattedPubkey}@${host}`);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <h1 className="text-3xl font-bold">{balance} sats</h1>
      {lightningAddress ? (
        <h2 className="flex flex-row">
          {formattedAddress}{" "}
          <Tooltip content="Copy lightning address">
            <ClipboardButton text={lightningAddress} />
          </Tooltip>
        </h2>
      ) : null}
      {nwa ? <h2>Wallet Connected to Discord Zap Bot</h2> : null}
    </div>
  );
};

export default Balance;

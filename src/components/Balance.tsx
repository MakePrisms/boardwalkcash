import { Tooltip } from "flowbite-react";
import React, { useState, useEffect } from "react";
import ClipboardButton from "./buttons/CopyButton";
import { assembleLightningAddress } from "@/utils/index";

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
       
      setLightningAddress(assembleLightningAddress(storedPubkey, host));
      
      setFormattedAddress(assembleLightningAddress(storedPubkey, host, true));
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full mb-28">
      <h1 className="mb-4">
        <span className="font-teko text-5xl font-bold">{balance}</span>{" "}
        <span className="font-4xl text-cyan-teal font-bold">sats</span>
      </h1>
      {lightningAddress ? (
        <h2 className="flex flex-row align-middle">
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

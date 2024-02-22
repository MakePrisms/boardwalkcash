import { Tooltip } from "flowbite-react";
import React, { useState, useEffect } from "react";
import ClipboardButton from "./buttons/CopyButton";
import { assembleLightningAddress } from "@/utils/index";

const Balance = ({ balance }: any) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full mb-28">
      <h1 className="mb-4">
        <span className="font-teko text-5xl font-bold">{balance}</span>{" "}
        <span className="font-4xl text-cyan-teal font-bold">sats</span>
      </h1>
    </div>
  );
};

export default Balance;

import React, { useState, useEffect } from "react";
import Balance from "@/components/Balance";
import LightningButtons from "@/components/buttons/LightningButtons";
import EcashButtons from "@/components/buttons/EcashButtons";
import CreateNwc from "@/components/CreateNwc";
import { CashuMint, CashuWallet, getEncodedToken } from '@cashu/cashu-ts';
import { useNwc } from "@/hooks/useNwc";
import { useCashu } from "@/hooks/useCashu";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";


export default function Home() {
  const wallet = new CashuWallet(new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!));

  const balance = useSelector((state: RootState) => state.cashu.balance);

  useNwc();
  useCashu();

  return (
      <main className="w-full h-full p-4">
          <Balance balance={balance} />
          <div className="py-8">
              <LightningButtons wallet={wallet} />
              <EcashButtons wallet={wallet} />
              <CreateNwc />
          </div>
      </main>
  );
}

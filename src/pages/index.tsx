import React, { useState, useEffect } from "react";
import Balance from "@/components/Balance";
import Receive from "@/components/buttons/lightning/Receive";
import Send from "@/components/buttons/lightning/Send";
import EcashButtons from "@/components/buttons/EcashButtons";
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { useNwc } from "@/hooks/useNwc";
import { useCashu } from "@/hooks/useCashu";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useAppDispatch } from '@/redux/store';
import { initializeUser } from "@/redux/reducers/UserReducer";
import Disclaimer from "@/components/Disclaimer";
import ActivityIndicator from "@/components/ActivityIndicator";


export default function Home() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(initializeUser());
    }, [dispatch]);

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

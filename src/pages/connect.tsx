import React, { useEffect } from "react";
import Balance from "@/components/Balance";
import Receive from "@/components/buttons/lightning/Receive";
import Send from "@/components/buttons/lightning/Send";
import EcashButtons from "@/components/buttons/EcashButtons";
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { useNwc } from "@/hooks/useNwc";
import { useAppDispatch } from '@/redux/store';
import { initializeUser } from "@/redux/reducers/UserReducer";
import { useCashu } from "@/hooks/useCashu";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";


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
        <main className="w-full h-full p-4">
            <Balance balance={balance} />
            <div className="py-8">
            <div className="flex flex-row justify-between w-1/2 mb-4 mx-auto">
                <Receive />
                <Send wallet={wallet} />
            </div>
                {/* <EcashButtons wallet={wallet} /> */}
            </div>
        </main>
    );
}

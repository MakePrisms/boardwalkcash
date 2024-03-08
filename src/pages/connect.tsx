import React, { useEffect } from "react";
import Disclaimer from "@/components/Disclaimer";
import { useAppDispatch } from '@/redux/store';
import { initializeUser } from "@/redux/slices/UserSlice";
import { Spinner } from "flowbite-react";
import { Relay, finalizeEvent, generateSecretKey, getPublicKey, nip04 } from "nostr-tools";
import { assembleLightningAddress } from "@/utils/lud16";


export default function Home() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(initializeUser());
    }, [dispatch]);

    const handleNwa = async () => {
        let params = new URL(document.location.href).searchParams;

        // Handle 'nwa' parameter
        let nwa = params.get("nwa");
        if (nwa) {
            // Decode the nwa parameter
            let decodedNwa = decodeURIComponent(nwa);

            // remove the prefix nostr+walletauth://
            decodedNwa = decodedNwa.replace("nostr+walletauth://", "");

            // Extract the appPublicKey from the decoded NWA string
            const [appPublicKey, queryParams] = decodedNwa.split("?");

            // Parse the query parameters
            let queryParamsObj = new URLSearchParams(queryParams);

            // Extract each value
            const appRelay = queryParamsObj.get("relay");
            // encode secret as hex
            const secret = queryParamsObj.get("secret");
            const requiredCommands = queryParamsObj.get("required_commands") || "";
            const budget = queryParamsObj.get("budget");
            const identity = queryParamsObj.get("identity");

            if (!appRelay) {
                console.log("No relay found");
                return;
            }

            const relay = await Relay.connect(appRelay);

            let nwaSecretKey = generateSecretKey();
            let nwaPubkey = getPublicKey(nwaSecretKey);
            // encode secret as hex
            const hexEncodedSecretKey = Buffer.from(nwaSecretKey).toString('hex');
            // save appPublicKey to localStorage
            window.localStorage.setItem('appPublicKey', appPublicKey);
            // save nwa object wth appPublicKey pk and sk to localStorage
            window.localStorage.setItem('nwa', JSON.stringify({ appPublicKey, nwaPubkey, nwaSecretKey: hexEncodedSecretKey }));

            let secretJson;

            const pubkey = window.localStorage.getItem('pubkey');

            if (pubkey) {
                secretJson = JSON.stringify({
                    secret: secret,
                    commands: [
                        ...requiredCommands.split(","),
                    ],
                    relay: appRelay,
                    lud16: `${assembleLightningAddress(pubkey, window.location.host)}`
                });
            } else {
                secretJson = JSON.stringify({
                    secret: secret,
                    commands: [
                        ...requiredCommands.split(","),
                    ],
                    relay: appRelay
                });
            }

            const encryptedContent = await nip04.encrypt(
                nwaSecretKey,
                appPublicKey,
                secretJson
            );

            let eventTemplate = {
                kind: 33194,
                created_at: Math.floor(Date.now() / 1000),
                tags: [["d", appPublicKey]],
                content: encryptedContent,
            };

            // this assigns the pubkey, calculates the event id and signs the event in a single step
            const signedEvent = finalizeEvent(eventTemplate, nwaSecretKey);
            await relay.publish(signedEvent);

            relay.close();

            window.location.href = "/?just_connected=true";
        }
    }

    useEffect(() => {
        handleNwa();
    }, []);

    return (
        <main className="flex flex-col items-center justify-center mx-auto min-h-screen">
            <div className="py-8 w-full">
                <div className="flex flex-col justify-center align-middle items-center mx-auto">
                   <Spinner size="xl" className="mb-4"/>
                   <h2>Connecting you to the Zap Bot...</h2>
                </div>
            </div>
            <footer className="fixed inset-x-0 bottom-0 text-center p-4 shadow-md flex  flex-col items-center justify-center">
                <Disclaimer />
            </footer>
        </main>
    );
}

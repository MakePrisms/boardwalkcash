import { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import NDK, { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk';
import { setSending, setError, setSuccess } from '@/redux/reducers/ActivityReducer';
import { useToast } from './useToast';
import { CashuMint, CashuWallet, PayLnInvoiceResponse, Proof } from '@cashu/cashu-ts';
import { getAmountFromInvoice } from '@/utils/bolt11';
import { assembleLightningAddress } from "@/utils/index";
import { getNeededProofs, updateStoredProofs } from '@/utils/cashu';
import { NIP47Method, NIP47Response, decryptEventContent } from '@/utils/nip47';
import { NIP47RequestProcessor } from '@/lib/nip47Processors';

const defaultRelays = [
    'wss://relay.getalby.com/v1',
    'wss://nostr.mutinywallet.com/',
    'wss://relay.mutinywallet.com',
    'wss://relay.damus.io',
    "wss://relay.snort.social",
    "wss://relay.primal.net"
]
export interface NWA {
    nwaSecretKey: string;
    nwaPubkey: string;
    appPublicKey: string;
}

export const useNwc = () => {
    const [queue, setQueue] = useState<{events: NDKEvent[]; nwa: NWA}[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recentInvoices, setRecentInvoices] = useState<string[]>([]); 
    const [processors, setProcessors] = useState<NIP47RequestProcessor[]>([]);

    const ndk = useRef<NDK | null>(null);
    const bufferTimer = useRef<NodeJS.Timeout | null>(null)
    const eventBufferRef = useRef<NDKEvent[]>([])

    const { addToast } = useToast();

    const dispatch = useDispatch();
    
    const mint = new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!);

    const wallet = new CashuWallet(mint);

    const createConnection = () => {
        const quickCashuPubkey = window.localStorage.getItem('pubkey');
        if (!quickCashuPubkey) {
            addToast("No public key found", "error");
            return;
        }
        const sk = generateSecretKey();
        const pk = getPublicKey(sk);
        const secretHex = Buffer.from(sk).toString('hex');
        const relayUrl = encodeURIComponent('wss://relay.mutinywallet.com');
        const lud16 = assembleLightningAddress(quickCashuPubkey, window.location.host);
        const uri = `nostr+walletconnect://${pk}?relay=${relayUrl}&secret=${secretHex}&lud16=${lud16}`;

        localStorage.setItem('nwc_secret', secretHex);
        localStorage.setItem('nwc_connectionUri', uri);
    };

    const setSince = (timestamp: number) => {
        window.localStorage.setItem('latestEventTimestamp', timestamp.toString()); 
    }

    const getSince = () => {
        let latestEventTimestamp = window.localStorage.getItem('latestEventTimestamp');
        const nowTimestamp = Math.floor(Date.now() / 1000);

        if (!latestEventTimestamp) {
            window.localStorage.setItem('latestEventTimestamp', nowTimestamp.toString());
            latestEventTimestamp = nowTimestamp.toString();
        }
        return parseInt(latestEventTimestamp) + 1;
    }

    const processEventBuffer = (nwa: NWA) => {
        setQueue((prev) => [...prev, {events: eventBufferRef.current, nwa: nwa}]);

        // Reset the buffer directly
        eventBufferRef.current = [];
        if (bufferTimer.current) {
            clearTimeout(bufferTimer.current);
            bufferTimer.current = null;
        }
    };

    useEffect(() => {
        const nwaAppPubkey = window.localStorage.getItem('appPublicKey');
        const nwa: NWA = JSON.parse(window.localStorage.getItem('nwa')!);
        console.log('nwaAppPubkey', nwaAppPubkey);
        console.log('nwa', nwa);


        const listen = async () => {
            ndk.current = new NDK();
            ndk.current.explicitRelayUrls = defaultRelays;
            await ndk.current.connect().then(() => console.log('connected to NDK'));

            const filter: NDKFilter = {
                kinds: [NDKKind.NostrWalletConnectReq],
                authors: [nwaAppPubkey!],
                since: getSince(),
            }

            const sub = ndk.current.subscribe(filter);

            sub.on('event', (event: NDKEvent) => {
                if (!eventBufferRef.current.some(e => e.id === event.id)){
                    // Add the event to the buffer if it's not already there
                    eventBufferRef.current.push(event);
                    setSince(event.created_at!)
                    console.log("## Added event to buffer:", eventBufferRef.current.length, "events in buffer")
                }

                if (!bufferTimer.current) {
                    bufferTimer.current = setTimeout(() => {
                        processEventBuffer(nwa); // Process and reset the buffer
                    }, 2000);
                }
            });
        }

        if (nwa && nwaAppPubkey) {
            let isMounted = true; // Flag to manage cleanup and avoid setting state on unmounted component

            if (isMounted) {
                listen();
            }

            return () => {
                isMounted = false; 
                // Cleanup logic here (e.g., unsubscribe from relays)
            };
        }
    }, []);

    // Effect to start processing when there are items in the queue
    useEffect(() => {
        const processQueue = async () => {
            if (!isProcessing && queue.length > 0) {
                setIsProcessing(true);
                
                const {events, nwa} = queue[0];
                const processingMessage = `Processing ${events.length > 1 ? "prism" : ""} payment...`;
                dispatch(setSending(processingMessage))

                // initialize all the requests
                const processors = events.map((e) => new NIP47RequestProcessor(e, nwa, wallet, ndk.current!));

                // decrypt all the requests
                await Promise.all(processors.map(async (p) => p.setUp()));

                const totalToSend = processors.reduce((acc, p) => acc + p.invoiceAmount, 0);

                dispatch(setSending(processingMessage + `(total: ${totalToSend} sat)`))

                console.log("##Total to send:", totalToSend, "sats")

                const promises = processors.map(async (p, idx) => {
                    const result = await p.process();

                    return result;
                })

                const results = await Promise.all(promises);

                console.log("Results:", results)

                const [totalPaid, totalFee] = results.reduce((acc, res) => {
                    if (!res) return acc
                    return [acc[0] + res.sent, acc[1] + res.fee]
                }, [0, 0]);

                setQueue((prev) => prev.slice(1));
                setIsProcessing(false);
                dispatch(setSuccess(`Sent ${totalPaid} sat${totalPaid === 1 ? "" : "s"}${totalFee ? ` and paid ${totalFee} sat in fees` : ""}`))
            };
        }
        processQueue();
    }, [queue, isProcessing]);

    function extractPublicKeyFromUri(uri: any) {
        const pkPart = uri.split('://')[1].split('?')[0];
        return pkPart;
    }

    // This function parses the NWC connection URI and extracts the public key and relay URL
    function parseConnectionUri(uri: string): { pk: string; relayUrl: string } {
        const url = new URL(uri);
        const pk = extractPublicKeyFromUri(uri);
        const relayUrl = decodeURIComponent(url.searchParams.get('relay') || '');
        return { pk, relayUrl };
    }
};

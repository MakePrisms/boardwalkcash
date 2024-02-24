import { useEffect, useState, useRef, use } from 'react';
import { useDispatch } from 'react-redux';
import { nip04, generateSecretKey, getPublicKey } from 'nostr-tools';
import NDK, { NDKEvent, NDKFilter, NDKKind, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { setSending, setError, setSuccess } from '@/redux/reducers/ActivityReducer';
import { useToast } from './useToast';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { getAmountFromInvoice } from '@/utils/bolt11';
import { assembleLightningAddress } from "@/utils/index";

const defaultRelays = [
    'wss://relay.getalby.com/v1',
    'wss://nostr.mutinywallet.com/',
    'wss://relay.mutinywallet.com',
    'wss://relay.damus.io',
    "wss://relay.snort.social",
    "wss://relay.primal.net"
]

interface NWA {
    nwaSecretKey: string;
    nwaPubkey: string;
    appPublicKey: string;
}

export const useNwc = () => {
    const [queue, setQueue] = useState<{event: NDKEvent; nwa: NWA}[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recentInvoices, setRecentInvoices] = useState<string[]>([]); 

    const ndk = useRef<NDK | null>(null);

    const { addToast } = useToast();

    const dispatch = useDispatch();
    
    const mint = new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!);

    const wallet = new CashuWallet(mint);

    const handleResponse = async (response: any, pubkey: string, eventId: string) => {
        const nwa = localStorage.getItem('nwa');
        const appPublicKey = localStorage.getItem('appPublicKey')!;
        const nwaPrivKey = JSON.parse(nwa!).nwaSecretKey;

        if (!nwaPrivKey) {
            addToast("No NWA private key found", "error");
            return;
        }

        const content = JSON.stringify({
            method: 'pay_invoice',
            error: null,
            result: {
                preimage: response.preimage,
            }
        })

        const encrypted = await nip04.encrypt(nwaPrivKey, appPublicKey, content);

        const event = new NDKEvent(ndk.current!)
        event.kind = 23195;
        event.content = encrypted;
        event.tags = [["e", eventId]];
        event.created_at = Math.floor(Date.now() / 1000);

        await event.sign(new NDKPrivateKeySigner(nwaPrivKey))

        const published = await event.publish();
        console.log('response from publish event', published);

        return published;
    }

    const handlePayInvoice = async (invoice: string, pubkey: string, eventId: string) => {
        const invoiceAmount = getAmountFromInvoice(invoice);
        const fee = await wallet.getFee(invoice);

        const proofs = JSON.parse(window.localStorage.getItem('proofs') || '[]');
        let amountToPay = invoiceAmount + fee;
        console.log("useing proofs", proofs);
        const balance = proofs.reduce((acc: number, proof: any) => acc + proof.amount, 0);
        if (balance < amountToPay) {
            dispatch(setError("Payment request exceeded available balance."))
            return;
        }

        try {
            dispatch(setSending("Processing payment request..."))
            const sendResponse = await wallet.send(amountToPay, proofs);
            if (sendResponse && sendResponse.send) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                const invoiceResponse = await wallet.payLnInvoice(invoice, sendResponse.send);
                if (!invoiceResponse || !invoiceResponse.isPaid) {
                    dispatch(setError("Payment failed"))
                } else {

                    const updatedProofs = sendResponse.returnChange || [];

                    if (invoiceResponse.change) {
                        invoiceResponse.change.forEach((change: any) => updatedProofs.push(change));
                    }

                    window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));
                    
                    const response = await handleResponse(invoiceResponse, pubkey, eventId);
                    
                    const newBalance = updatedProofs.map((proof: any) => proof.amount).reduce((a: number, b: number) => a + b, 0);

                    dispatch(setSuccess(balance - newBalance));
                }
            }
        } catch (error) {
            console.error(error);
            dispatch(setError("Payment failed"))
        }
        
    }

    const handleRequest = async (decrypted: any, pubkey: string, eventId: string) => {
        switch (decrypted.method) {
            case 'pay_invoice':
                console.log("got pay invoice request")
                const invoice = decrypted.params.invoice;
                if (recentInvoices.includes(invoice)) {
                    console.log("invoice already paid");
                    return;
                } else {
                    setRecentInvoices((prev) => [...prev, invoice]);
                }
                await handlePayInvoice(invoice, pubkey, eventId);

            default:
                return;
        }
    }

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

    const decryptEvent = async (event: any, nwa: any) => {
        const decrypted = await nip04.decrypt(nwa.nwaSecretKey, event.pubkey, event.content);
        console.log('decrypted', decrypted);
        if (decrypted) {
            const parsed = JSON.parse(decrypted);
            const response = await handleRequest(parsed, event.pubkey, event.id);
        }
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

            sub.on('event', (event: NDKEvent) => setQueue((prev) => [...prev, {event: event, nwa: nwa}]));
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

                const {event, nwa} = queue[0];

                await decryptEvent(event, nwa);

                setQueue((prev) => prev.slice(1));
                setIsProcessing(false);
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

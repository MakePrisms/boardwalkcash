import { useEffect, useState, useRef, use } from 'react';
import { useDispatch } from 'react-redux';
import { nip04, generateSecretKey, getPublicKey } from 'nostr-tools';
import NDK, { NDKEvent, NDKFilter, NDKKind, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { setSending, setError, setSuccess } from '@/redux/reducers/ActivityReducer';
import { useToast } from './useToast';
import { CashuMint, CashuWallet, PayLnInvoiceResponse, Proof } from '@cashu/cashu-ts';
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

        return published;
    }

    const getNeededProofs = (amount: number) => {
        const proofs: Proof[] = JSON.parse(window.localStorage.getItem('proofs') || '[]');

        let closestProofs: Proof[] = [];
        let closestSum = -Infinity; 

        // First, check if any single proof is big enough
        for (let proof of proofs) {
            if (
                proof.amount >= amount &&
                (closestSum === 0 || proof.amount < closestSum)
            ) {
                closestProofs = [proof];
                closestSum = proof.amount;
            }
        }

        const findClosest = (idx: number, currentSum: number, currentProofs: Proof[]) => {
            // If we are closer this time, update the closest values
            if ((currentSum >= amount && currentSum < closestSum) || (currentSum >= amount && closestSum < amount)) {
                closestProofs = [...currentProofs];
                closestSum = currentSum;
            }

            if (idx >= proofs.length) return; // Base case

            // Include next proof
            findClosest(idx + 1, currentSum + proofs[idx].amount, [...currentProofs, proofs[idx]]);

            // Exclude next proof
            findClosest(idx + 1, currentSum, currentProofs);
        }
        
        // Only start the recursive search if we haven't already found a single proof that meets the criteria
        if (closestSum < amount || closestProofs.length > 1) {
            findClosest(0, 0, []);
        };

        console.log("## closest amount", closestProofs.reduce((acc, proof) => acc + proof.amount, 0));

        const remainngProofs = proofs.filter((proof) => !closestProofs.includes(proof));

        if (closestSum < amount) {
            // put everything back
            window.localStorage.setItem('proofs', JSON.stringify([...remainngProofs, ...closestProofs]));
            return []
        } else {
            // just put change back
            window.localStorage.setItem('proofs', JSON.stringify([...remainngProofs]));
            return closestProofs;
        }
    }
    
    const updateHeldProofs = (proofsToAdd: Proof[]) => {
        if (proofsToAdd.length === 0) return;

        const proofs: Proof[] = JSON.parse(window.localStorage.getItem('proofs') || '[]');

        const updatedProofs = [...proofs, ...proofsToAdd];
        window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));
    }

    const handleAsyncPayment = async (invoice: string, invoiceAmount: number, fee: number, proofs: Proof[], pubkey: string, eventId: string) => {
        let invoiceResponse: PayLnInvoiceResponse
        try {
            invoiceResponse = await wallet.payLnInvoice(invoice, proofs);
        } catch (e) {
            console.error("Error paying invoice", e);
            dispatch(setError("Payment failed"))
            updateHeldProofs(proofs);
            return;
        }
        
        if (!invoiceResponse || !invoiceResponse.isPaid) {
            // put the proofs back
            updateHeldProofs(proofs);
            dispatch(setError("Payment failed"))
        } else {
            console.log("invoiceResponse", invoiceResponse);

            if (invoiceResponse.change) {
                updateHeldProofs(invoiceResponse.change);
            }

            await handleResponse(invoiceResponse, pubkey, eventId);
            
            const feePaid = fee - invoiceResponse.change.map((proof: any) => proof.amount).reduce((a: number, b: number) => a + b, 0);

            const feeMessage = feePaid > 0 ? ` + ${feePaid} sats fee` : '';
            
            console.log(`## paid ${invoiceAmount + feePaid} sats total (${feePaid} sat fee).`)
            dispatch(setSuccess(`Sent ${invoiceAmount} sat${invoiceAmount === 1 ? "" : "s"}${feeMessage}`));
        }
    }

    const handlePayInvoice = async (invoice: string, pubkey: string, eventId: string) => {
        const invoiceAmount = getAmountFromInvoice(invoice);
        const fee = await wallet.getFee(invoice);
        
        let amountToPay = invoiceAmount + fee;
        console.log("## amountToPay", amountToPay);

        // only take what we need from local storage. Put the rest back
        const proofs = getNeededProofs(amountToPay);

        const balance = proofs.reduce((acc: number, proof: any) => acc + proof.amount, 0);
        if (balance < amountToPay) {
            console.log("## insufficient balance", balance, amountToPay);
            dispatch(setError("Payment request exceeded available balance."))
            return;
        }

        let change: Proof[] = [];
        try {
            dispatch(setSending("Processing payment request..."))
            
            let proofsToSend = proofs;
            
            if (balance !== amountToPay) {
                console.log("## swapping proofs")

                const sendResponse = await wallet.send(amountToPay, proofs);
                console.log("## swapped complete")
                if (sendResponse && sendResponse.send) {
                    // Send the exact amount we need
                    proofsToSend = sendResponse.send;

                    // add any change to the change array
                    sendResponse.returnChange.forEach(p => change.push(p))
                }
            }
            // await new Promise((resolve) => setTimeout(resolve, 3000));
            handleAsyncPayment(invoice, invoiceAmount, fee, proofsToSend, pubkey, eventId).then(() => console.log("payment complete"));
        } catch (error) {
            console.error(error);
            dispatch(setError("Payment failed"))
        } finally {
            console.log("change", change);
            updateHeldProofs(change);
        }
        
    }

    const handleRequest = async (decrypted: any, pubkey: string, eventId: string) => {
        switch (decrypted.method) {
            case 'pay_invoice':
                const invoice = decrypted.params.invoice;
                if (recentInvoices.includes(invoice)) {
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
        if (decrypted) {
            const parsed = JSON.parse(decrypted);
            setSince(event.created_at)
            const response = await handleRequest(parsed, event.pubkey, event.id);
        }
    }

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

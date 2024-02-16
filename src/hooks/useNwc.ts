import { useEffect } from 'react';
import { SimplePool, nip04, generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';
import { useToast } from './useToast';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
import { getAmountFromInvoice } from '@/utils/bolt11';

const defaultRelays = [
    'wss://relay.getalby.com/v1',
    'wss://nostr.mutinywallet.com/',
    'wss://relay.mutinywallet.com',
    'wss://relay.damus.io',
    "wss://relay.snort.social",
    "wss://relay.primal.net"
]

export const useNwc = () => {
    const { addToast } = useToast();

    const mint = new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!);

    const wallet = new CashuWallet(mint);

    const pool = new SimplePool()

    const handleResponse = async (response: any, pubkey: string) => {
        const secret = localStorage.getItem('nwc_secret');

        if (!secret) {
            addToast("Secret not found", "error");
            return;
        }

        const content = JSON.stringify({
            method: 'pay_invoice',
            error: null,
            result: {
                preimage: response.preimage,
            }
        })

        const encrypted = await nip04.encrypt(secret, pubkey, content);

        const event = {
            kind: 23195,
            content: encrypted,
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
        }

        const secretBuffer = Buffer.from(secret, 'hex');

        const signedEvent = await finalizeEvent(event, secretBuffer);

        const published = await Promise.any(pool.publish(defaultRelays, signedEvent))

        console.log('response from publish event', published);

        return published;
    }

    const handlePayInvoice = async (invoice: string, pubkey: string) => {
        const invoiceAmount = getAmountFromInvoice(invoice);
        const fee = await wallet.getFee(invoice);

        const proofs = JSON.parse(window.localStorage.getItem('proofs') || '[]');
        let amountToPay = invoiceAmount + fee;

        if (proofs.reduce((acc: number, proof: any) => acc + proof.amount, 0) < amountToPay) {
            addToast("You don't have enough funds to pay this invoice + fees", "error");
            return;
        }

        try {
            const sendResponse = await wallet.send(amountToPay, proofs);
            if (sendResponse && sendResponse.send) {
                console.log('sendResponse', sendResponse);
                const invoiceResponse = await wallet.payLnInvoice(invoice, sendResponse.send);
                console.log('invoiceResponse', invoiceResponse);
                if (!invoiceResponse || !invoiceResponse.isPaid) {
                    addToast("An error occurred during the payment.", "error");
                } else {
                    if (sendResponse.returnChange) {
                        window.localStorage.setItem('proofs', JSON.stringify(sendResponse.returnChange));
                    }
                    addToast("Payment successful", "success");
                    const response = await handleResponse(invoiceResponse, pubkey);
                }
            }
        } catch (error) {
            console.error(error);
            addToast("An error occurred while trying to send.", "error");
        }
    }

    const handleRequest = async (decrypted: any, pubkey: string) => {
        switch (decrypted.method) {
            case 'pay_invoice':
                const invoice = decrypted.params.invoice;
                await handlePayInvoice(invoice, pubkey);

            default:
                return;
        }
    }

    const createConnection = () => {
        const quickCashuPubkey = window.localStorage.getItem('pubkey');
        const sk = generateSecretKey();
        const pk = getPublicKey(sk);
        const secretHex = Buffer.from(sk).toString('hex');
        const relayUrl = encodeURIComponent('wss://relay.mutinywallet.com');
        const uri = `nostr+walletconnect://${pk}?relay=${relayUrl}&secret=${secretHex}&lud16=${quickCashuPubkey}@quick-cashu.vercel.app`;

        localStorage.setItem('nwc_secret', secretHex);
        localStorage.setItem('nwc_connectionUri', uri);
    };

    useEffect(() => {
        const connectionUri = localStorage.getItem('nwc_connectionUri');
        const secret = localStorage.getItem('nwc_secret');

        // Call createConnection if either nwc_connectionUri or nwc_secret is missing
        if (!connectionUri || !secret) {
            createConnection();
        }

        if (connectionUri && secret) {
            const { pk, relayUrl } = parseConnectionUri(connectionUri);

            let isMounted = true; // Flag to manage cleanup and avoid setting state on unmounted component

            const attemptReconnect = (initialDelay = 1000, maxDelay = 30000) => {
                let delay = initialDelay;
                const reconnect = () => {
                    if (!isMounted) return; // Stop if component has unmounted
                    listenForEvents().catch(() => {
                        // Wait for the current delay, then try to reconnect
                        setTimeout(() => {
                            if (!isMounted) return; // Check again before trying to reconnect
                            reconnect();
                            // Increase the delay for the next attempt, capped at maxDelay
                            delay = Math.min(delay * 2, maxDelay);
                        }, delay);
                    });
                };
                reconnect();
            };

            const listenForEvents = async () => {
                const sub = pool.subscribeMany(
                    defaultRelays,
                    [
                        {
                            authors: [pk], kinds: [13194, 23194]
                        },
                    ], {
                    onevent: async (event: any) => {
                        // decrypt the event with the secret using nip04
                        const decrypted = await nip04.decrypt(secret, pk, event.content);
                        if (decrypted) {
                            const parsed = JSON.parse(decrypted);
                            const response = await handleRequest(parsed, event.pubkey);
                        }
                    },
                    onclose(reason) {
                        console.log('Subscription closed:', reason);
                    }
                }
                );
            }

            // Initial connection attempt
            attemptReconnect();

            return () => {
                isMounted = false; // Set the flag to false when the component unmounts
                // Cleanup logic here (e.g., unsubscribe from relays)
            };
        }
    }, []); // Empty dependency array ensures this effect runs only once on mount

    function extractPublicKeyFromUri(uri: any) {
        // Remove the scheme part and split by "?" to isolate the public key
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

import { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import NDK, { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk';
import { setSending, setError, setSuccess } from '@/redux/slices/ActivitySlice';
import { AmountPreference, CashuMint, CashuWallet, Proof, SendResponse } from '@cashu/cashu-ts';
import { getNeededProofs, addBalance } from '@/utils/cashu';
import { NIP47RequestProcessor } from '@/lib/nip47Processors';
import { lockBalance, setBalance, unlockBalance } from '@/redux/slices/CashuSlice';

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

    const ndk = useRef<NDK | null>(null);
    const bufferTimer = useRef<NodeJS.Timeout | null>(null)
    const eventBufferRef = useRef<NDKEvent[]>([])

    const dispatch = useDispatch();
    
    const mint = new CashuMint(process.env.NEXT_PUBLIC_CASHU_MINT_URL!);

    const wallet = new CashuWallet(mint);

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

    const setActivityMessage = () => {
        if(eventBufferRef.current.length ===1) {
            dispatch(setSending("Processing payment..."))
        } else {
            dispatch(setSending("Processing prism payment..."))
        }
    }
    
    const processEventBuffer = (nwa: NWA) => {
        console.log("Processing event buffer...", eventBufferRef.current.length, "events", eventBufferRef.current.map(e => e.rawEvent()))

        const events = [...eventBufferRef.current]
        setQueue((prev) => [...prev, {events, nwa: nwa}]);

        console.log("## Resetting event buffer")
        eventBufferRef.current = [];
        if (bufferTimer.current) {
            clearTimeout(bufferTimer.current);
            bufferTimer.current = null;
        }
    };

    useEffect(() => {
        const nwaAppPubkey = window.localStorage.getItem('appPublicKey');
        const nwa: NWA = JSON.parse(window.localStorage.getItem('nwa')!);

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

                    setActivityMessage()
                }

                if (!bufferTimer.current) {
                    bufferTimer.current = setTimeout(() => {
                        processEventBuffer(nwa); // Process and reset the buffer
                    }, 2500);
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

    class InsufficientFundsError extends Error {
        constructor(totalToSend: number) {
            super("Insufficient funds. Trying to send " + totalToSend + " sats total.");
            this.name = "InsufficientFundsError";
        }
    }

    const calcTokens = (processors: NIP47RequestProcessor[]) => {
        let totalToSend = 0;
        let preference: Array<AmountPreference> = [];
        const denominationsNeeded = processors.reduce((acc, p) => {
            const id = p.requestEvent.id;
            const denoms: number[] = p.calcNeededDenominations();
            if (!acc.has(id)) {
                acc.set(id, []);
            }
            acc.get(id)!.push(...denoms);
            totalToSend += denoms.reduce((a, b) => a + b, 0);
            denoms.forEach((d) => {
                if (preference.some((p) => p.amount === d)) {
                    preference.find((p) => p.amount === d)!.count += 1;
                } else {
                    preference.push({ amount: d, count: 1 });
                }
            });
            return acc;
        }, new Map() as Map<string, number[]>);

        console.log("## Total to send:", totalToSend);
        console.log("## Preferences:", preference);

        const proofsToSwap = getNeededProofs(totalToSend);

        console.log("## Proofs to swap:", proofsToSwap);

        if (proofsToSwap.length === 0) {
            throw new InsufficientFundsError(totalToSend);
        }   

        return { denominations: denominationsNeeded, proofs: proofsToSwap, preference, totalToSend };
    }

    const initProcessors = (events: NDKEvent[], nwa: NWA) => {
        return events.map((e) => new NIP47RequestProcessor(e, nwa, wallet, ndk.current!));
    }

    const failPayments = (processors: NIP47RequestProcessor[], code?: string) => {
        processors.forEach((p) => {
            p.sendError(code || "INTERNAL").catch((e) => console.error("Error sending error", e));
        });
    }

    const resetQueue = () => {
        dispatch(unlockBalance());
        setQueue((prev) => prev.slice(1));
        setIsProcessing(false);
    }

    const getProofsForProcessor = (allProofs: SendResponse, denominations: number[]) => {
        const proofsToSend = [];
        for (const denomination of denominations) {
            const index = allProofs.send.findIndex(p => p.amount === denomination);
            if (index === -1) {
                throw new Error('Insufficient proofs for the required denomination');
            }
            proofsToSend.push(allProofs.send.splice(index, 1)[0]);
        }
        return proofsToSend;
    };

    const setFinalMessage = (results: {sent: number; fee: number;}[]) => {
        const [totalPaid, totalFee] = results.reduce((acc, res) => {
            if (!res) return acc;
            return [acc[0] + res.sent, acc[1] + res.fee]
        }, [0, 0]);

        if (totalPaid === 0) {
            dispatch(setError("Payment failed"))
        } else {
            dispatch(setSuccess(`Sent ${totalPaid} sat${totalPaid === 1 ? "" : "s"}${totalFee ? ` + ${totalFee} sat${totalFee > 1 ? "s": ""} fees` : ""}`))
        }
    }

    // Effect to start processing when there are items in the queue
    useEffect(() => {
        const processQueue = async () => {
            if (isProcessing) return;
            if (queue.length === 0 || queue[0].events.length === 0 ) return;
            
            console.log("Starting to process queue...", queue)

            dispatch(lockBalance())
            setIsProcessing(true);
            
            const {events, nwa} = queue[0];

            const processingMessage = `Processing ${events.length > 1 ? "prism" : ""} payment...`;
            dispatch(setSending(processingMessage))

            const processors: NIP47RequestProcessor[] = initProcessors(events, nwa);

            try {
                // decrypt all the requests and set invoice + fee amounts
                for (const processor of processors) {
                    // one at a time otherwise mint gets sad
                    await processor.setUp();
                }
            
                const { denominations, proofs, preference, totalToSend } = calcTokens(processors);

                let swappedProofs: SendResponse;
                try {
                    swappedProofs = await wallet.send(totalToSend, proofs, preference);
                } catch (e) {
                    console.error("Error swapping proofs", e);
                    dispatch(setError("Payment failed: error swapping proofs"));
                    addBalance([...proofs])
                    failPayments(processors);
                    resetQueue();
                    return;
                } 

                // add the change proofs back to what we have stored
                addBalance([...swappedProofs.returnChange]);

                // set the proofs to pay invoice for each processor
                processors.forEach((p) => {
                    const denoms = denominations.get(p.requestEvent.id);

                    if (!denoms) throw new Error('something went wrong. no denominations found');

                    const proofsToSend = getProofsForProcessor(swappedProofs, denoms);
                    
                    console.log("## proofsToSend", proofsToSend);
                    p.proofs = [...proofsToSend];
                });


                let payCounter = 0;
                if (processors.length === 1) {
                    dispatch(setSending("Paying invoice..."))
                } else {
                    dispatch(setSending(`Paying invoice ${payCounter + 1} of ${processors.length}...`))
                }

                // execute the payment for each processor
                const promises = processors.map(async (p) => {
                    try {
                        const result = await p.process();

                        payCounter++
                        
                        const msg = `Paying invoice ${payCounter + 1} of ${processors.length}...`
                        dispatch(setSending(msg))

                        console.log("## result", result);
                        return result;
                    } catch (e) {
                        console.error("Error processing payment", e);
                        return undefined;
                    }
                })

                const results = await Promise.all(promises);

                console.log("Results:", results)

                resetQueue();

                const newBalance = JSON.parse(localStorage.getItem('proofs') || '[]').reduce((acc: number, proof: Proof) => acc + proof.amount, 0);
                dispatch(setBalance(newBalance));

                setFinalMessage(results);
            } catch (e) {
                if (e instanceof InsufficientFundsError) {
                    dispatch(setError(e.message))
                }
                console.error("Error setting up processors", e);
                dispatch(setError("Error sending payments"));
                failPayments(processors);
                resetQueue();
                return;
            }
        }


        processQueue();
    }, [queue, isProcessing]);
};

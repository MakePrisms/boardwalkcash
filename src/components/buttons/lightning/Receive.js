import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Modal, Spinner, Tooltip } from "flowbite-react";
import { useDispatch } from "react-redux";
import { resetStatus, setError, setReceiving, setSuccess } from "@/redux/reducers/ActivityReducer";
import { ArrowDownRightIcon } from "@heroicons/react/20/solid"
import { useToast } from "@/hooks/useToast";
import { Relay, generateSecretKey, getPublicKey, finalizeEvent, nip04 } from "nostr-tools";
import { useCashu } from "@/hooks/useCashu";
import { assembleLightningAddress } from "@/utils/index";
import ClipboardButton from "../CopyButton";

const Receive = () => {
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [isReceiving, setIsReceiving] = useState(false);
    const [invoiceToPay, setInvoiceToPay] = useState('');
    const [lightningAddress, setLightningAddress] = useState();

    const { requestMintInvoice } = useCashu();

    const { addToast } = useToast();

    const dispatch = useDispatch();
  
    useEffect(() => {
      const storedPubkey = window.localStorage.getItem("pubkey");
  
      if (storedPubkey) {
        const host = window.location.host;
         
        setLightningAddress(assembleLightningAddress(storedPubkey, host));
      }
    }, []);

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
            const requiredCommands = queryParamsObj.get("required_commands");
            const budget = queryParamsObj.get("budget");
            const identity = queryParamsObj.get("identity");

            // Log or process the extracted values as needed
            console.log("App Public Key:", appPublicKey);
            console.log("Relay:", appRelay);
            console.log("Secret:", secret);
            console.log("Required Commands:", requiredCommands);
            console.log("Budget:", budget);
            console.log("Identity:", identity);

            if (!appRelay) {
                console.log("No relay found");
                return;
            }

            const relay = await Relay.connect(appRelay);

            // let's publish a new event while simultaneously monitoring the relay for it
            let nwaSecretKey = generateSecretKey();
            let nwaPubkey = getPublicKey(nwaSecretKey);
            // encode secret as hex
            const hexEncodedSecretKey = Buffer.from(nwaSecretKey).toString('hex');
            // save appPublicKey to localStorage
            window.localStorage.setItem('appPublicKey', appPublicKey);
            // save nwa object wth appPublicKey pk and sk to localStorage
            window.localStorage.setItem('nwa', JSON.stringify({ appPublicKey, nwaPubkey, nwaSecretKey: hexEncodedSecretKey }));

            console.log("req commands:", typeof requiredCommands, requiredCommands);

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

            console.log("Secret JSON:", secretJson);

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
            console.log("Signed event:", signedEvent);
            await relay.publish(signedEvent);

            relay.close();

            window.location.href = '/';
        }
    }

    useEffect(() => {
        if (window.location.pathname === '/connect') {
            handleNwa();
        }
    }, []);

    const handleReceive = async () => {
        setIsReceiving(true);
        if (!amount) {
            addToast("Please enter an amount.", "warning");
            setIsReceiving(false);
            return;
        }
        
        dispatch(setReceiving());

        try {
            const { pr, hash } = await requestMintInvoice(amount);

            setInvoiceToPay(pr);

            const pollingResponse = await axios.post(`${process.env.NEXT_PUBLIC_PROJECT_URL}/api/invoice/polling/${hash}`, {
                pubkey: window.localStorage.getItem('pubkey'),
                amount: amount,
            });

            console.log('pollingResponse', pollingResponse);

            if (pollingResponse.status === 200 && pollingResponse.data.success) {
                setTimeout(() => {
                    setIsReceiving(false);
                    dispatch(setSuccess(`Received ${amount} sats!`))
                }, 1000);
            }
        } catch (error) {
            console.error(error);
            dispatch(setError("An error occurred."))
        } finally {
            setIsReceiving(false);
            dispatch(resetStatus())
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            addToast("Invoice copied to clipboard.", "success");
            setInvoiceToPay('');
            setAmount('')
            setIsReceiving(false);
            setIsReceiveModalOpen(false);
        } catch (err) {
            console.error("Failed to copy: ", err);
            addToast("Failed to copy invoice to clipboard.", "error");
        }
    };

    return (
        <>
            <Button
                onClick={() => setIsReceiveModalOpen(true)}
                className="me-10 bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none">
                 <span className="text-lg">Receive</span> <ArrowDownRightIcon className="ms-2 h-5 w-5" /> </Button>
            <Modal show={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)}>
                <Modal.Header>Receive Lightning Payment</Modal.Header>
                {isReceiving && !invoiceToPay ? (
                    <div className="flex justify-center items-center my-8">
                        <Spinner size="xl" />
                    </div>
                ) : (
                    <>
                        <Modal.Body>
                            {invoiceToPay ? (
                                <>
                                    <div className="space-y-6">
                                        <input
                                            className="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                                            type="text"
                                            value={invoiceToPay}
                                            readOnly
                                        />
                                    </div>
                                    <Modal.Footer className="w-full flex flex-row justify-end">
                                        <Button color="success" onClick={() => copyToClipboard(invoiceToPay)}>
                                            Copy
                                        </Button>
                                    </Modal.Footer>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-6">
                                        <input
                                            className="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                                            type="number"
                                            placeholder="Enter amount"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </div>
                                    <Modal.Footer className="flex flex-row justify-around">
                                        {/* <Button color="failure" onClick={() => setIsReceiveModalOpen(false)}>
                                            Cancel
                                        </Button> */}
                                        <Button color="success" onClick={handleReceive}>
                                            Generate Invoice
                                        </Button>
                                        <Tooltip content="Copy lightning address">
                                            <ClipboardButton toCopy={lightningAddress} toShow="Lightning Address"/>
                                        </Tooltip>
                                    </Modal.Footer>
                                </>
                            )}
                        </Modal.Body>
                    </>
                )}
            </Modal>
        </>
    );
};

export default Receive;

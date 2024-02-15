import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, Modal, Spinner } from "flowbite-react";
import { CashuMint, CashuWallet, getEncodedToken } from '@cashu/cashu-ts';
import { Relay, generateSecretKey, getPublicKey, finalizeEvent, nip04 } from "nostr-tools";
import { getAmountFromInvoice } from "@/utils/bolt11";

const LightningButtons = ({ wallet, mint }: any) => {
    const [invoice, setInvoice] = useState('');
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isReceiving, setIsReceiving] = useState(false);
    const [invoiceToPay, setInvoiceToPay] = useState('');
    const [paymentConfirmed, setPaymentConfirmed] = useState('' as any);
    const [isPaymentConfirmedModalOpen, setIsPaymentConfirmedModalOpen] = useState(false);

    const handleSend = async () => {
        setIsSending(true);
        if (!invoice) {
            return alert("Please enter a Lightning invoice.");
        }

        const invoiceAmount = getAmountFromInvoice(invoice);
        const proofs = JSON.parse(window.localStorage.getItem('proofs') || '[]');
        const estimatedFee = await wallet.getFee(invoice);

        proofs.sort((a: any, b: any) => b.amount - a.amount);

        let amountToPay = invoiceAmount + estimatedFee;
        // Assuming `totalProofsAmount` is a utility function that sums up the amount in all proofs
        let totalProofsAmount = proofs.reduce((acc: number, proof: any) => acc + proof.amount, 0);

        if (totalProofsAmount < amountToPay) {
            alert("Insufficient funds to cover the payment and fees.");
            return;
        }

        try {
            const response = await wallet.payLnInvoice(invoice, proofs);

            console.log('response', response);

            let updatedProofs: any = []

            if (!response || response.error) {
                console.error(response);
                return alert("An error occurred during the payment.");
            }

            if (response.change) {
                console.log('change', response.change);
                // map through the change array and save each proof to localStorage overwriting the old ones
                response.change.forEach((proof: any) => {
                    console.log('proof', proof);
                    updatedProofs.push(proof);
                });

                window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));
            }

            setIsSendModalOpen(false);
            setInvoice('');
        } catch (error) {
            console.error(error);
            alert("An error occurred during the payment.");
        } finally {
            setIsSending(false);
        }
    };

    const handleReceive = async () => {
        setIsReceiving(true); // Start the receiving process
        if (!amount) {
            alert("Please enter an amount.");
            setIsReceiving(false);
            return;
        }

        try {
            const { pr, hash } = await wallet.requestMint(parseInt(amount)); // Convert amount to integer

            if (!pr || !hash) {
                alert("An error occurred while trying to receive.");
                setIsReceiving(false);
                return;
            }

            setInvoiceToPay(pr);

            const pollingResponse = await axios.post(`${process.env.NEXT_PUBLIC_PROJECT_URL}/api/invoice/polling/${hash}`, {
                pubkey: window.localStorage.getItem('pubkey'),
                amount: amount,
            });

            console.log('pollingResponse', pollingResponse);

            if (pollingResponse.status === 200 && pollingResponse.data.success) {
                setTimeout(() => {
                    setIsReceiving(false);
                    setPaymentConfirmed(amount);
                    setIsPaymentConfirmedModalOpen(true);
                }, 3000);
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred while trying to receive.");
        } finally {
            setIsReceiving(false); // End the receiving process
        }
    };

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
            const secret = queryParamsObj.get("secret")!;
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
            let sk = generateSecretKey();
            let pk = getPublicKey(sk);

            console.log("Secret key:", typeof sk, sk);
            console.log("Public key:", pk);

            let secretJson;

            const pubkey = window.localStorage.getItem('pubkey');

            if (pubkey) {
                secretJson = JSON.stringify({ secret: secret, lud16: `${pubkey}@quick-cashu.vercel.app` });
            } else {
                secretJson = JSON.stringify({ secret: secret });
            }

            const encryptedContent = await nip04.encrypt(
                sk,
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
            const signedEvent = finalizeEvent(eventTemplate, sk);
            console.log("Signed event:", signedEvent);
            await relay.publish(signedEvent);

            relay.close();
        }
    }

    useEffect(() => {
        if (window.location.pathname === '/connect') {
            handleNwa();
        }
    }, []);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("Invoice copied to clipboard!"); // Provide feedback to the user (optional)
        } catch (err) {
            console.error("Failed to copy: ", err);
            alert("Failed to copy the invoice to clipboard.");
        }
    };

    return (
        <div className="flex flex-col mx-auto w-1/2 mt-16">
            <div className="flex flex-row justify-between w-full mb-4">
                <Button onClick={() => setIsReceiveModalOpen(true)} color="warning">Receive</Button>
                <h3 className="text-center text-lg font-bold">Lightning</h3>
                <Button onClick={() => setIsSendModalOpen(true)} color="success">Send</Button>
            </div>
            <Modal show={isSendModalOpen} onClose={() => setIsSendModalOpen(false)}>
                <Modal.Header>Send Lightning Invoice</Modal.Header>
                {isSending ? (
                    <div className="flex justify-center items-center my-8">
                        <Spinner size={"xl"} />
                    </div>
                ) : (
                    <>
                        <Modal.Body>
                            <div className="space-y-6">
                                <input
                                    className="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                                    type="text"
                                    placeholder="Enter Lightning Invoice"
                                    value={invoice}
                                    onChange={(e) => setInvoice(e.target.value)}
                                />
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button color="failure" onClick={() => setIsSendModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button color="success" onClick={handleSend}>
                                Submit
                            </Button>
                        </Modal.Footer>
                    </>
                )}
            </Modal>
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
                                    <Modal.Footer>
                                        <Button color="failure" onClick={() => setIsReceiveModalOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button color="success" onClick={handleReceive}>
                                            Submit
                                        </Button>
                                    </Modal.Footer>
                                </>
                            )}
                        </Modal.Body>
                    </>
                )}
            </Modal>
            <Modal show={isPaymentConfirmedModalOpen} onClose={() => setIsPaymentConfirmedModalOpen(false)}>
                <Modal.Header>Payment Confirmed</Modal.Header>
                <Modal.Body className="text-black">
                    You have successfully received {paymentConfirmed} sats.
                </Modal.Body>
                <Modal.Footer>
                    <Button color="success" onClick={() => setIsPaymentConfirmedModalOpen(false)}>
                        OK
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default LightningButtons;
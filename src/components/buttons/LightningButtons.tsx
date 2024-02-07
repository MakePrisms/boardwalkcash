import React, { useEffect, useState } from "react";
import { Button, Modal } from "flowbite-react";
import { CashuMint, CashuWallet, getEncodedToken } from '@cashu/cashu-ts';
import { Relay, generateSecretKey, getPublicKey, finalizeEvent, nip04 } from "nostr-tools";
import { getAmountFromInvoice } from "@/utils/bolt11";

const LightningButtons = ({ wallet }: any) => {
    const [invoice, setInvoice] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleNwcSend = async () => {

    }

    const handleSend = async () => {
        if (!invoice) {
            return alert("Please enter a Lightning invoice.");
        }

        // Assuming the function to parse the invoice and get the amount is implemented
        // For demonstration, let's assume we already have the amount needed to pay
        const invoiceAmount = getAmountFromInvoice(invoice); // You need to implement this
        const proofs = JSON.parse(window.localStorage.getItem('proofs') || '[]');

        console.log('invoiceAmount', invoiceAmount);

        // estimate fee
        const estimatedFee = await wallet.getFee(invoice);
        console.log('estimatedFee', estimatedFee);

        // Sort proofs in descending order of amount
        proofs.sort((a: any, b: any) => b.amount - a.amount);

        let amountToPay = invoiceAmount + estimatedFee;
        let selectedProofs = [];
        for (let proof of proofs) {
            if (amountToPay >= proof.amount) {
                selectedProofs.push(proof);
                amountToPay -= proof.amount;
            }
            if (amountToPay === 0) break;
        }

        // Check if we successfully matched the invoice amount
        if (amountToPay > 0) {
            alert('Unable to match the invoice amount with available proofs.');
            return;
        }

        try {
            console.log('Selected proofs', selectedProofs);
            // Pay the invoice with selected proofs
            // Replace this with the actual method to pay the invoice using selected proofs
            const result = await wallet.payLnInvoice(invoice, selectedProofs);
            console.log('Payment result', result);

            const selectedProofIdentifiers = selectedProofs.map(proof => proof.id + proof.secret);

            // Now remove the used proofs from local storage but leave the rest
            const remainingProofs = proofs.filter((proof: any) =>
                !selectedProofIdentifiers.includes(proof.id + proof.secret)
            );
            window.localStorage.setItem('proofs', JSON.stringify(remainingProofs));

            setIsModalOpen(false);
            setInvoice('');

        } catch (error) {
            console.error(error);
            alert("An error occurred during the payment.");
        }
    };



    const handleReceive = async () => {
        const { pr, hash } = await wallet.requestMint(21);
        console.log('pr', pr);
        console.log('hash', hash);

        // pay this invoice
        if (pr) {
            if (typeof window.webln === "undefined") {
                return alert("No WebLN available.");
            }

            try {
                await window.webln.enable();
                const result = await window.webln.sendPayment(pr);
                console.log('res', result);

                if (result) {
                    const { proofs: newProofs } = await wallet.requestTokens(21, hash);

                    if (newProofs) {
                        // Retrieve the current proofs from localStorage
                        const existingProofs = JSON.parse(window.localStorage.getItem('proofs') || '[]');

                        // Add the new proofs to the array
                        const updatedProofs = existingProofs.concat(newProofs);

                        // Save the updated array back to localStorage
                        window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));
                    }

                    //Encoded proofs can be spent at the mint
                    const encoded = getEncodedToken({
                        token: [{ mint: process.env.NEXT_PUBLIC_CASHU_MINT_URL!, proofs: newProofs }],
                    });

                    if (encoded) {
                        // Retrieve the current tokens from localStorage
                        const tokens = JSON.parse(window.localStorage.getItem('tokens') || '[]');

                        // Add the new token to the array
                        tokens.push(encoded);

                        // Save the updated array back to localStorage
                        window.localStorage.setItem('tokens', JSON.stringify(tokens));
                    }
                }

            } catch (error) {
                console.error(error);
                alert("An error occurred during the payment.");
            }
        }
    }

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

            const secretJson = JSON.stringify({secret: secret});

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

    return (
        <div className="flex flex-col mx-auto w-1/2 mt-16">
            <div className="flex flex-row justify-between w-full mb-4">
                <Button onClick={handleReceive} color="warning">Receive</Button>
                <h3 className="text-center text-lg font-bold">Lightning</h3>
                <Button onClick={() => setIsModalOpen(true)} color="warning">Send</Button>
            </div>
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <Modal.Header>Send Lightning Invoice</Modal.Header>
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
                    <Button color="failure" onClick={() => setIsModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button color="success" onClick={handleSend}>
                        Submit
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default LightningButtons;
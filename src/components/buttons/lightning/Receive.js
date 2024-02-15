import React, { useState } from "react";
import axios from "axios";
import { Button, Modal, Spinner } from "flowbite-react";
import { useToast } from "@/hooks/useToast";

const Receive = ({ wallet }) => {
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [isReceiving, setIsReceiving] = useState(false);
    const [invoiceToPay, setInvoiceToPay] = useState('');

    const { addToast } = useToast();

    const handleReceive = async () => {
        setIsReceiving(true);
        if (!amount) {
            addToast("Please enter an amount.", "warning");
            setIsReceiving(false);
            return;
        }

        try {
            const { pr, hash } = await wallet.requestMint(parseInt(amount));

            if (!pr || !hash) {
                addToast("An error occurred while trying to receive.", "error");
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
                    addToast(`You have successfully received ${amount} sats.`, "success");
                }, 1000);
            }
        } catch (error) {
            console.error(error);
            addToast("An error occurred while trying to receive.", "error");
        } finally {
            setIsReceiving(false);
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            addToast("Invoice copied to clipboard.", "success");
        } catch (err) {
            console.error("Failed to copy: ", err);
            addToast("Failed to copy invoice to clipboard.", "error");
        }
    };

    return (
        <div>
            <Button onClick={() => setIsReceiveModalOpen(true)} color="warning">Receive</Button>
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
        </div>
    );
};

export default Receive;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Modal, Spinner, Tooltip } from "flowbite-react";
import { ArrowDownRightIcon } from "@heroicons/react/20/solid"
import { useDispatch } from "react-redux";
import { resetStatus, setError, setReceiving, setSuccess } from "@/redux/reducers/ActivityReducer";
import { useToast } from "@/hooks/useToast";
import { useCashu } from "@/hooks/useCashu";
import { assembleLightningAddress } from "@/utils/index";
import ClipboardButton from "../CopyButton";
import QRCode from "qrcode.react";

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
        // timeout for the pubKey to be set in localStorage on first load
        setTimeout(() => {
            const storedPubkey = window.localStorage.getItem("pubkey");
    
            if (storedPubkey) {
                const host = window.location.host;
                setLightningAddress(assembleLightningAddress(storedPubkey, host));
            }
        }, 500);
    }, []);

    const handleReceive = async () => {
        setIsReceiving(true);
        if (!amount) {
            addToast("Please enter an amount.", "warning");
            setIsReceiving(false);
            return;
        }

        try {
            const { pr, hash } = await requestMintInvoice(amount);
            setInvoiceToPay(pr);

            const pollingResponse = await axios.post(`${process.env.NEXT_PUBLIC_PROJECT_URL}/api/invoice/polling/${hash}`, {
                pubkey: window.localStorage.getItem('pubkey'),
                amount: amount,
            });

            if (pollingResponse.status === 200 && pollingResponse.data.success) {
                setIsReceiving(false);
                setIsReceiveModalOpen(false);
                setInvoiceToPay('');
                setAmount('');
                dispatch(setSuccess(`Received ${amount} sats!`))
            }
        } catch (error) {
            console.error(error);
            dispatch(setError("An error occurred."))
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

    const handleModalClose = () => {
        setIsReceiveModalOpen(false);
        setInvoiceToPay('');
        setAmount('');
        setIsReceiving(false);
    }

    return (
        <>
            <Button
                onClick={() => setIsReceiveModalOpen(true)}
                className="me-10 bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none">
                <span className="text-lg">Receive</span> <ArrowDownRightIcon className="ms-2 h-5 w-5" />
            </Button>
            <Modal show={isReceiveModalOpen} onClose={handleModalClose}>
                <Modal.Header>Receive Lightning Payment</Modal.Header>
                {isReceiving && !invoiceToPay ? (
                    <div className="flex justify-center items-center my-8">
                        <Spinner size="xl" />
                    </div>
                ) : (
                    <>
                        <Modal.Body>
                            {invoiceToPay ? (
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    <QRCode value={`lightning:${invoiceToPay}`} size={258} level={"H"} className="rounded-lg m-4 border-white border-2" />
                                    <Button color="success" onClick={() => copyToClipboard(invoiceToPay)}>
                                        Copy
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <input
                                        className="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                                        type="number"
                                        placeholder="Enter amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                    <div className="flex flex-col items-center md:flex-row justify-around">
                                        <Button color="success" onClick={handleReceive} className="mb-4 md:mb-0">
                                          &nbsp;&nbsp;Generate Invoice&nbsp;
                                        </Button>
                                        <Tooltip content="Copy lightning address">
                                            <ClipboardButton onClick={handleModalClose} toCopy={lightningAddress} toShow="Lightning Address" />
                                        </Tooltip>
                                    </div>
                                </div>
                            )}
                        </Modal.Body>
                    </>
                )}
            </Modal>
        </>
    );
};

export default Receive;

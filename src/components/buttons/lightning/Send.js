import React, { useState } from "react";
import { Button, Modal, Spinner } from "flowbite-react";
import { ArrowUpRightIcon } from '@heroicons/react/20/solid'
import { getAmountFromInvoice } from "@/utils/bolt11";
import { useToast } from "@/hooks/useToast";
import { useCashu } from "@/hooks/useCashu";

const Send = ({ wallet }) => {
    const [invoice, setInvoice] = useState('');
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [estimatedFee, setEstimatedFee] = useState(null); // State to store estimated fee
    const [showSubmit, setShowSubmit] = useState(false); // State to control button visibility

    const { addToast } = useToast();

    const { handlePayInvoice } = useCashu();

    const estimateFee = async () => {
        if (!invoice) {
            addToast("Please enter an invoice.", "warning");
            return;
        }

        setIsSending(true);
        try {
            const fee = await wallet.getFee(invoice);
            setEstimatedFee(fee);
            setShowSubmit(true); // Show submit button after estimating fee
            addToast(`Estimated fee: ${fee} sats`, "info");
        } catch (error) {
            console.error(error);
            addToast("An error occurred while estimating the fee.", "error");
        } finally {
            setIsSending(false);
        }
    };

    const handleSend = async () => {
        setIsSending(true);

        try {
            await handlePayInvoice(invoice, estimatedFee);
            addToast("Invoice paid successfully.", "success");
        } catch (error) {
            console.error(error);
            addToast("An error occurred while paying the invoice.", "error");
        }

        setIsSending(false);
        setIsSendModalOpen(false);
        setInvoice('');
        setEstimatedFee(null);
        setShowSubmit(false);
    };

    return (
        <>
            <Button
                onClick={() => setIsSendModalOpen(true)}
                className="bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none"
            >
                &nbsp;&nbsp;Send&nbsp;<ArrowUpRightIcon className="ms-2 h-5 w-5" /></Button>
            <Modal show={isSendModalOpen} onClose={() => setIsSendModalOpen(false)}>
                <Modal.Header>Send Lightning Invoice</Modal.Header>
                {isSending ? (
                    <div className="flex justify-center items-center my-8">
                        <Spinner size="xl" />
                    </div>
                ) : (
                    <>
                        <Modal.Body>
                            <input
                                className="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                                type="text"
                                placeholder="Enter Lightning Invoice"
                                value={invoice}
                                onChange={(e) => setInvoice(e.target.value)}
                            />
                            {estimatedFee !== null && (
                                <div className="mt-4 text-sm text-black">
                                    Estimated Fee: {estimatedFee} sats
                                    <br />
                                    Total amount to pay: {getAmountFromInvoice(invoice) + estimatedFee} sats
                                </div>
                            )}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button color="failure" onClick={() => setIsSendModalOpen(false)}>
                                Cancel
                            </Button>
                            {!showSubmit && (
                                <Button color="info" onClick={estimateFee}>
                                    Estimate
                                </Button>
                            )}
                            {showSubmit && (
                                <Button color="success" onClick={handleSend}>
                                    Submit
                                </Button>
                            )}
                        </Modal.Footer>
                    </>
                )}
            </Modal>
        </>
    );
};

export default Send;

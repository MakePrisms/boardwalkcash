import { useState } from "react";
import { Modal, Spinner, Button } from "flowbite-react";
import { getAmountFromInvoice } from "@/utils/bolt11";
import { useCashu } from "@/hooks/useCashu";
import { useToast } from "@/hooks/useToast";
import { CashuWallet } from "@cashu/cashu-ts";

interface SendModalProps {
  isSendModalOpen: boolean;
  setIsSendModalOpen: (value: boolean) => void;
  wallet: CashuWallet;
}

export const SendModal = ({
  isSendModalOpen,
  setIsSendModalOpen,
  wallet
}: SendModalProps) => {
  const [invoice, setInvoice] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null); // State to store estimated fee
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
    setIsSendModalOpen(false);

    try {
      await handlePayInvoice(invoice, estimatedFee as number);
      addToast("Invoice paid successfully.", "success");
    } catch (error) {
      console.error(error);
      addToast("An error occurred while paying the invoice.", "error");
    }

    setIsSending(false);
    setInvoice("");
    setEstimatedFee(null);
    setShowSubmit(false);
  };
  return (
    <Modal show={isSendModalOpen} onClose={() => setIsSendModalOpen(false)}>
      <Modal.Header>Send</Modal.Header>
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
              placeholder="Lightning address or invoice"
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
            />
            {estimatedFee !== null && (
              <div className="mt-4 text-sm text-black">
                Estimated Fee: {estimatedFee} sats
                <br />
                Total amount to pay:{" "}
                {getAmountFromInvoice(invoice) + estimatedFee} sats
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
  );
};

{
  /* <Modal show={isSendModalOpen} onClose={() => setIsSendModalOpen(false)}>
                <Modal.Header>Send</Modal.Header>
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
                                placeholder="Lightning address or invoice"
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
            </Modal> */
}

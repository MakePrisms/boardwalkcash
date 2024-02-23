import { useState } from "react";
import { Modal, Spinner, Button } from "flowbite-react";
import { getAmountFromInvoice } from "@/utils/bolt11";
import { useCashu } from "@/hooks/useCashu";
import { useToast } from "@/hooks/useToast";
import { CashuWallet } from "@cashu/cashu-ts";
import { getInvoiceFromLightningAddress } from "@/utils";

interface SendModalProps {
  isSendModalOpen: boolean;
  setIsSendModalOpen: (value: boolean) => void;
  wallet: CashuWallet;
}

enum Tabs {
  Destination = "destination",
  Amount = "amount",
  Fee = "fee",
  Send = "send",
}

export const SendModal = ({
  isSendModalOpen,
  setIsSendModalOpen,
  wallet,
}: SendModalProps) => {
  const [currentTab, setCurrentTab] = useState<Tabs>(Tabs.Destination);
  const [destination, setDestination] = useState("");
  const [amountSat, setAmountSat] = useState(0);
  const [invoice, setInvoice] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null); // State to store estimated fee
  const [showSubmit, setShowSubmit] = useState(false); // State to control button visibility

  const { addToast } = useToast();

  const { handlePayInvoice } = useCashu();

  const estimateFee = async (toPay?: string) => {
    if (!toPay) {
      try {
        const invoice = await getInvoiceFromLightningAddress(
          destination,
          amountSat * 1000
        );
        setInvoice(invoice);
        toPay = invoice;
      } catch (error) {
        console.error(error);
        addToast("An error occurred while fetching the invoice.", "error");
        return;
      }
    }

    setIsSending(true);
    try {
      console.log("Estimating fee for invoice:", toPay)
      const fee = await wallet.getFee(toPay!);
      setEstimatedFee(fee);
      setShowSubmit(true); // Show submit button after estimating fee
      addToast(`Estimated fee: ${fee} sats`, "info");
      setCurrentTab(Tabs.Fee);
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

    setCurrentTab(Tabs.Destination);
    setDestination("");
    setIsSending(false);
    setInvoice("");
    setEstimatedFee(null);
    setShowSubmit(false);
  };

  const handleDestination = async () => {
    if (!destination) {
      addToast("Please enter a destination.", "warning");
      return;
    }

    if (destination.startsWith("lnbc")) {
      console.log("Destination is an invoice");
      setInvoice(destination);
      estimateFee(destination);
      setCurrentTab(Tabs.Fee);
    } else if (destination.includes("@")) {
      console.log("Destination is a lightning address");
      setCurrentTab(Tabs.Amount);
    }
  };

  const renderTab = () => {
    switch (currentTab) {
      case Tabs.Destination:
        return (
          <>
            <Modal.Body>
              <input
                className="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                type="text"
                placeholder="Lightning address or invoice"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button color="info" onClick={handleDestination}>
                Continue
              </Button>
            </Modal.Footer>
          </>
        );
      case Tabs.Amount:
        return (
          <>
            <Modal.Body>
              <input
                className="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                type="number"
                placeholder="Amount in sats"
                value={amountSat || ""}
                onChange={(e) =>
                  setAmountSat(() => parseInt(e.target.value, 10))
                }
              />
            </Modal.Body>
            <Modal.Footer>
              <Button color="info" onClick={(e) => estimateFee()}>
                Continue
              </Button>
            </Modal.Footer>
          </>
        );
      case Tabs.Fee:
        return (
          <>
            <Modal.Body>
              <div className="mt-4 text-sm text-black">
                Estimated Fee: {estimatedFee} sats
                <br />
                Total amount to pay:{" "}
                {getAmountFromInvoice(invoice) + estimatedFee!} sats
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button color="success" onClick={handleSend}>
                Pay
              </Button>
            </Modal.Footer>
          </>
        );
      case Tabs.Send:
        return (
          <div className="flex justify-center items-center my-8">
            <Spinner size="xl" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal show={isSendModalOpen} onClose={() => setIsSendModalOpen(false)}>
      <Modal.Header>Send</Modal.Header>
      {isSending ? (
        <div className="flex justify-center items-center my-8">
          <Spinner size="xl" />
        </div>
      ) : (
        renderTab()
      )}
    </Modal>
  );
};

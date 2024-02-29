import { NIP47Method, NIP47Request, NIP47Response, decryptEventContent } from "@/utils/nip47";
import { NWA } from "@/hooks/useNwc";
import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { getAmountFromInvoice } from "@/utils/bolt11";
import { CashuWallet, PayLnInvoiceResponse, Proof } from "@cashu/cashu-ts";
import { getNeededProofs, updateStoredProofs } from "@/utils/cashu";

export class NIP47RequestProcessor {
  private method: string | undefined = undefined;
  private params: { invoice?: string; } | undefined = undefined;
  private invoices: string[] = []
  private isPrism: boolean = false;
  public invoiceAmount: number = 0;
  private requestHandlers = new Map<string, () => Promise<any>>([
    ['pay_invoice', this._pay_invoice.bind(this)]
  ]);

  constructor(
    public readonly requestEvent: NDKEvent,
    public readonly nwa: NWA,
    private wallet: CashuWallet,
    private ndk: NDK
  ) {
    // this.nwa = nwa;
    // this.requestEvent = requestEvent;
    // if (this.requestEvents.length > 1) {
    //   this.isPrism = true
    // }
  }

  async sendResponse (response: any, requestEvent: NDKEvent) {
    const nwa = localStorage.getItem("nwa");
    const nwaPrivKey = JSON.parse(nwa!).nwaSecretKey;

    if (!nwaPrivKey) {
      addToast("No NWA private key found", "error");
      return;
    }

    const responseEvent = new NIP47Response(
      this.ndk,
      NIP47Method.pay_invoice,
      { ...response },
      null,
      requestEvent
    );

    await responseEvent.buildResponse(nwaPrivKey);

    const published = await responseEvent.publish();

    return published;
  };

  async handleAsyncPayment  (invoice: string, fee: number, proofs: Proof[], requestEvent: NDKEvent) {
    let invoiceResponse: PayLnInvoiceResponse
    try {
        invoiceResponse = await this.wallet.payLnInvoice(invoice, proofs);
    } catch (e) {
        console.error("Error paying invoice", e);
        updateStoredProofs(proofs);
        return;
    }
    
    if (!invoiceResponse || !invoiceResponse.isPaid) {
        // put the proofs back
        updateStoredProofs(proofs);
        // dispatch(setError("Payment failed"))
    } else {
        console.log("invoiceResponse", invoiceResponse);

        if (invoiceResponse.change) {
            updateStoredProofs(invoiceResponse.change);
        }

        await this.sendResponse({preimage: invoiceResponse.preimage || "preimage"}, requestEvent);
        
        const feePaid = fee - invoiceResponse.change.map((proof: any) => proof.amount).reduce((a: number, b: number) => a + b, 0);

        const feeMessage = feePaid > 0 ? ` + ${feePaid} sats fee` : '';
        
        console.log(`## paid ${this.invoiceAmount + feePaid} sats total (${feePaid} sat fee).`)
        return {sent: this.invoiceAmount, fee: feePaid}
        // dispatch(setSuccess(`Sent ${invoiceAmount} sat${invoiceAmount === 1 ? "" : "s"}${feeMessage}`));
    }
}

  private async _pay_invoice(): Promise<any> {
    const { pubkey, id } = this.requestEvent;
    const invoice = this.params?.invoice
    if (!invoice) {
      throw new Error("could not get invoice from request")
    }
    const fee = await this.wallet.getFee(invoice);

    let amountToPay = this.invoiceAmount + fee;
    console.log("## amountToPay", amountToPay);

    // only take what we need from local storage. Put the rest back
    const proofs = getNeededProofs(amountToPay);

    const balance = proofs.reduce((acc: number, proof: any) => acc + proof.amount, 0);
    if (balance < amountToPay) {
      console.log(`## insufficient balance. Have ${balance}. Need ${amountToPay}`);

      throw new Error("Insufficient balance")
    }

    let change: Proof[] = [];
    let proofsToSend = proofs;

    if (balance !== amountToPay) {
      console.log("## swapping proofs")

      const sendResponse = await this.wallet.send(amountToPay, proofs);
      console.log("## swapped complete")
      if (sendResponse && sendResponse.send) {
        // Send the exact amount we need
        proofsToSend = sendResponse.send;

        // add any change to the change array
        sendResponse.returnChange.forEach(p => change.push(p))
      }
    }
    // await new Promise((resolve) => setTimeout(resolve, 3000));
    const payResult = await this.handleAsyncPayment(invoice, fee, proofsToSend, this.requestEvent)
    console.log("change", change);
    updateStoredProofs(change);
    return payResult
  }

  private async _execute(handler: any) {
    console.log("Executing handler for ", this.method)
    try {
      return await handler()
    } catch (e) {
      console.error("error executing handler", e)
    }
  }

  public async setUp() {
    const { method, params } = await decryptEventContent(
      this.requestEvent,
      this.nwa
    );

    this.method = method;
    this.params = params;

    if (method !== "pay_invoice") {
      throw new Error("nwc method NOT_IMPLEMENTED")
    }

    if (!this.params?.invoice) {
      throw new Error("could not get invoice from request")
    }

    this.invoiceAmount = getAmountFromInvoice(this.params.invoice)
  }

  public async process() {
    if (!this.method) {
      throw new Error("muyst call setUp before process")
    }


    const handler = this.requestHandlers.get(this.method)

    if (!handler) {
      throw new Error("nwc method NOT_IMPLEMENTED")
    }

    const responseContent = await this._execute(handler)

    return responseContent
  }
}

export class PaymentProcessor { }
function addToast(arg0: string, arg1: string) {
  throw new Error("Function not implemented.");
}


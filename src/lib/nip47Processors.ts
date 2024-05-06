import { NIP47Method, NIP47Request, NIP47Response, decryptEventContent } from '@/utils/nip47';
import { NWA } from '@/hooks/useNwc';
import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
import { getAmountFromInvoice } from '@/utils/bolt11';
import { CashuWallet, MeltTokensResponse, Proof } from '@cashu/cashu-ts';
import { addBalance } from '@/utils/cashu';

export class NIP47RequestProcessor {
   private method: string | undefined = undefined;
   private params: { invoice?: string } | undefined = undefined;
   public fee: number = 0;
   public invoiceAmount: number = 0;
   public amountCents: number = 0;
   private requestHandlers = new Map<string, () => Promise<any>>([
      ['pay_invoice', this._pay_invoice.bind(this)],
   ]);
   public proofs: Proof[] | undefined = undefined;
   private quoteId: string | undefined = undefined;

   constructor(
      public readonly requestEvent: NDKEvent,
      public readonly nwa: NWA,
      private wallet: CashuWallet,
      private ndk: NDK,
   ) {}

   async sendResponse(result: object | null, error: object | null) {
      const nwa = localStorage.getItem('nwa');
      const nwaPrivKey = JSON.parse(nwa!).nwaSecretKey;

      if (!nwaPrivKey) {
         throw new Error("NWA's private key not found.");

         return;
      }

      const responseEvent = new NIP47Response(
         this.ndk,
         NIP47Method.pay_invoice,
         result,
         error,
         this.requestEvent,
      );

      await responseEvent.buildResponse(nwaPrivKey);

      const published = await responseEvent.publish();

      return published;
   }

   async sendError(errorCode: string) {
      await this.sendResponse(null, { code: errorCode });
   }

   async handleAsyncPayment(invoice: string, fee: number, requestEvent: NDKEvent) {
      if (!this.proofs) {
         throw new Error('Something went wrong, no proofs set');
      }
      let invoiceResponse: MeltTokensResponse;
      try {
         invoiceResponse = await this.wallet.payLnInvoice(invoice, this.proofs, {
            quote: this.quoteId!,
            amount: this.amountCents,
            fee_reserve: fee,
         });
      } catch (e) {
         addBalance(this.proofs);
         throw new Error(`Error paying invoice: ${e}`);
      }

      if (!invoiceResponse || !invoiceResponse.isPaid) {
         // put the proofs back
         addBalance(this.proofs);
         throw new Error('Payment failed');
      } else {
         if (invoiceResponse.change) {
            addBalance(invoiceResponse.change);
         }

         await this.sendResponse({ preimage: invoiceResponse.preimage || 'preimage' }, null);

         const feePaid =
            fee -
            invoiceResponse.change
               .map((proof: Proof) => proof.amount)
               .reduce((a: number, b: number) => a + b, 0);

         console.log(`## paid ${this.invoiceAmount + feePaid} sats total (${feePaid} sat fee).`);
         return { sent: this.amountCents, fee: feePaid };
      }
   }

   private async _pay_invoice(): Promise<any> {
      const invoice = this.params?.invoice;
      if (!invoice) {
         throw new Error('could not get invoice from request');
      }

      let amountToPay = this.invoiceAmount + this.fee;
      console.log('## amountToPay', amountToPay);

      const payResult = await this.handleAsyncPayment(invoice, this.fee, this.requestEvent);

      return payResult;
   }

   private async _execute(handler: () => Promise<any>) {
      console.log('Executing handler for ', this.method);
      try {
         return await handler();
      } catch (e) {
         this.sendError('INTERNAL');
         console.error('error executing handler', e);
      }
   }

   public async setUp() {
      const { method, params } = await decryptEventContent(this.requestEvent, this.nwa);

      this.method = method;
      this.params = params;

      if (method !== 'pay_invoice') {
         this.sendError('NOT_IMPLEMENTED');
         throw new Error('nwc method NOT_IMPLEMENTED');
      }

      if (!this.params?.invoice) {
         this.sendError('INTERNAL');
         throw new Error('could not get invoice from request');
      }

      console.log('## invoice', this.params.invoice);

      this.invoiceAmount = getAmountFromInvoice(this.params.invoice);

      this.amountCents = await fetch('https://mempool.space/api/v1/prices').then(res =>
         res.json().then(data => {
            const usdBtc = data.USD;
            const usdSat = usdBtc / 100_000_000;
            return Math.floor(parseFloat((this.invoiceAmount * usdSat * 100).toFixed(2)));
         }),
      );

      if (this.amountCents < 1) {
         this.sendError('INTERNAL');
         throw new Error('amount less than 1 cent');
      }

      try {
         const meltQuote = await this.wallet.getMeltQuote(this.params.invoice);
         this.quoteId = meltQuote.quote;
         this.fee = meltQuote.fee_reserve;
      } catch {
         this.sendError('INTERNAL');
         throw new Error('failed to fetch fee');
      }
   }

   public async process() {
      if (!this.method) {
         this.sendError('INTERNAL');
         if (this.proofs) {
            this.proofs && addBalance(this.proofs);
         }
         throw new Error('must call setUp before process');
      }

      const handler = this.requestHandlers.get(this.method);

      if (!handler) {
         this.proofs && addBalance(this.proofs);
         this.sendError('NOT_IMPLEMENTED');
         throw new Error('nwc method NOT_IMPLEMENTED');
      }

      const responseContent = await this._execute(handler);

      return responseContent;
   }

   public calcNeededDenominations() {
      const amount = Math.ceil(this.amountCents + this.fee);

      let remaining = amount;
      let denoms: number[] = [];
      while (remaining > 0) {
         const tokenValue = Math.pow(2, Math.floor(Math.log2(remaining)));
         remaining -= tokenValue;
         if (remaining < 0) {
            throw new Error('remaining amount is negative');
         }
         denoms.push(tokenValue);
      }
      return denoms;
   }
}

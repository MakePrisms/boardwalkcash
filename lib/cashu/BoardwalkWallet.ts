import {
  type CashuWallet,
  type MeltProofsResponse,
  type MeltQuoteResponse,
  MeltQuoteState,
  type Proof,
} from '@cashu/cashu-ts';
import { sumProofs } from '@cashu/cashu-ts/dist/lib/es5/utils';
import { decodeBolt11 } from 'lib/util/bolt11';
import { getP2PKPubkeyFromProofs } from './proof';

export class BoardwalkWallet {
  private wallet: CashuWallet;
  private getCounter: () => number; // TODO: make this accept a keysetId to find specific counter
  private setCounter: (value: number) => void;
  private privkey: string;

  constructor(
    wallet: CashuWallet,
    getCounter: () => number,
    setCounter: (value: number) => void,
    privkey: string,
  ) {
    this.wallet = wallet;
    this.getCounter = getCounter;
    this.setCounter = setCounter;
    this.privkey = privkey;
  }

  async melt(
    invoice: string,
    meltQuote: MeltQuoteResponse,
  ): Promise<MeltProofsResponse> {
    // TODO: block and only allow paying one invoice at a time
    // TODO: check if invoice already paid

    // TODO: double check multi-currency support
    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { amountSat: invoiceAmount } = decodeBolt11(invoice);
    const amount = meltQuote.amount + meltQuote.fee_reserve;

    // get proofs to send in correct denominatino
    let sendProofs: Proof[] = [];
    try {
      // biome-ignore lint/correctness/noUnusedVariables: <explanation>
      const { keepProofs, sendProofs: _sendProofs } = await this.send(
        [], // TODO: Get ALL proofs for this wallet
        amount,
        false,
        true,
      );
      // TODO: addProofs(keepProofs)
      sendProofs = _sendProofs;
      if (sendProofs.length === 0) {
        throw new Error('could not split proofs.');
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    let countChangeOutputs = 0;
    let keysetCounterIncrease = 0;
    const keysetId = this.wallet.keysetId;

    try {
      // TODO: see cached responses https://github.com/cashubtc/nuts/blob/main/19.md
      await this.addOutgoingPendingInvoiceToHistory(meltQuote, sendProofs);

      // NUT 08 blank outputs for change
      const counter = this.getCounter();

      // QUIRK: we increase the keyset counter by sendProofs and the maximum number of possible change outputs
      // this way, in case the user exits the app before payLnInvoice is completed, the returned change outputs won't cause a "outputs already signed" error
      // if the payment fails, we decrease the counter again
      this.increaseKeysetCounter(keysetId, sendProofs.length);
      if (meltQuote.fee_reserve > 0) {
        countChangeOutputs = Math.ceil(Math.log2(meltQuote.fee_reserve)) || 1;
        this.increaseKeysetCounter(keysetId, countChangeOutputs);
        keysetCounterIncrease += countChangeOutputs;
      }

      const pubkeyLock = getP2PKPubkeyFromProofs(sendProofs);
      if (pubkeyLock) {
        // TODO: make sure there is a key that can unlock these proofs
      }

      // NOTE: if the user exits the app while we're in the API call, JS will emit an error that we would catch below!
      // We have to handle that case in the catch block below
      const data = await this.wallet.meltProofs(meltQuote, sendProofs, {
        keysetId,
        counter,
      });

      if (data.quote.state !== MeltQuoteState.PAID) {
        throw new Error('Invoice not paid.');
      }
      const amount_paid = amount - sumProofs(data.change);
      // TODO: notify sucess!

      console.log('#### pay lightning: token paid');

      // delete spent tokens from db
      // TODO: removeProofs(sendProofs);

      // NUT-08 get change
      if (data.change != null) {
        const changeProofs = data.change;
        console.log(`## Received change: ${sumProofs(changeProofs)}`);
        // TODO: addProofs(changeProofs);
      }

      // TODO:
      // addPaidToken({
      //   amount: -amount_paid,
      //   serializedProofs: serializeProofs(sendProofs),
      //   unit: activeUnit,
      //   mint: activeMintUrl,
      // });

      this.updateInvoiceInHistory(meltQuote, {
        status: 'paid',
        amount: -amount_paid,
      });

      return data;
    } catch (e) {
      // TODO: add event listener for a 'beforeUnload' event
      const isUnloading = false;
      if (isUnloading) {
        // NOTE: An error is thrown when the user exits the app while the payment is in progress.
        // do not handle the error if the user exits the app
        throw e;
      }
      // get quote and check state
      const mintQuote = await this.wallet.checkMeltQuote(meltQuote.quote);
      if (
        mintQuote.state === MeltQuoteState.PAID ||
        mintQuote.state === MeltQuoteState.PENDING
      ) {
        console.log(
          '### melt: error, but quote is paid or pending. not rolling back.',
        );
        throw e;
      }
      // // roll back proof management and keyset counter
      // TODO: setReserved(sendProofs, false);
      this.increaseKeysetCounter(keysetId, -keysetCounterIncrease);
      this.removeOutgoingInvoiceFromHistory(meltQuote.quote);

      console.error(e);
      this.handleOutputsHaveAlreadyBeenSignedError(keysetId, e as Error); // TODO: fix type cast
      throw e;
    }
  }

  async send(
    proofs: Proof[],
    amount: number,
    invalidate: boolean,
    includeFees = false,
  ): Promise<{ sendProofs: Proof[]; keepProofs: Proof[] }> {
    try {
      // all proofs that can be used in this transaction
      const spendableProofs = this.spendableProofs(proofs, amount);
      let proofsToSend = this.coinSelect(spendableProofs, amount, includeFees);

      const totalAmount = sumProofs(proofsToSend);
      const fees = includeFees ? this.wallet.getFeesForProofs(proofsToSend) : 0;
      const targetAmount = amount + fees;

      let keepProofs: Proof[] = [];
      let sendProofs: Proof[] = [];

      if (totalAmount !== targetAmount) {
        // we need to swap for the correct denominations
        const counter = this.getCounter();
        proofsToSend = this.coinSelect(spendableProofs, targetAmount, true);
        const result = await this.wallet.send(targetAmount, proofsToSend, {
          counter,
          proofsWeHave: spendableProofs,
        });
        keepProofs = result.keep;
        sendProofs = result.send;
        this.setCounter(counter + keepProofs.length + sendProofs.length);
      } else if (totalAmount === targetAmount) {
        keepProofs = [];
        sendProofs = proofsToSend;
      } else {
        throw new Error('could not split proofs.');
      }

      if (invalidate) {
        // TODO: removeProofs(sendProofs)
      }
      // TODO: setProofsReserved(sendProofs, true)
      return { sendProofs, keepProofs };
    } catch (e) {
      // setProofsReserved(sendProofs, false)
      this.handleOutputsHaveAlreadyBeenSignedError;
      throw e;
    }
  }
  handleOutputsHaveAlreadyBeenSignedError(keysetId: string, error: Error) {
    if (error.message.includes('outputs have already been signed')) {
      this.increaseKeysetCounter(keysetId, 10);
      // TODO: notify("Please try again.");
      return true;
    }
    return false;
  }
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  spendableProofs(proofs: Proof[], amount: number): Proof[] {
    // TODO: only get proofs from store that are not involved in another transaction
    // NOTE: should return ALL possible proofs because cashu-ts does better coin selection with all the `proofsWeHave`
    const spendableProofs = proofs;
    return spendableProofs;
  }

  coinSelect(proofs: Proof[], amount: number, includeFees: boolean): Proof[] {
    if (sumProofs(proofs) < amount) {
      // there are not enough proofs to pay the amount
      return [];
    }
    const { send: selectedProofs, keep: _ } = this.wallet.selectProofsToSend(
      proofs,
      amount,
      includeFees,
    );
    return selectedProofs;
  }

  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  async increaseKeysetCounter(keysetId: string, by: number) {
    // TODO
  }
  async addOutgoingPendingInvoiceToHistory(
    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    quote: MeltQuoteResponse,
    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    proofs: Proof[],
  ): Promise<void> {
    // TODO: add to store
  }
  async updateInvoiceInHistory(
    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    quote: MeltQuoteResponse,
    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    options?: { status?: 'pending' | 'paid'; amount?: number },
  ) {
    // TODO
  }
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  async removeOutgoingInvoiceFromHistory(quote: string) {
    // TODO
  }

  get unit(): string {
    return this.wallet.unit;
  }
}

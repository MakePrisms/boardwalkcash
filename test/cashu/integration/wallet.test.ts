import { beforeEach, describe, expect, test } from 'bun:test';
// SEE lib/cashu/wallet.ts for question related to type imports. This is the other way to do it.
import { type CashuWallet, MeltQuoteState } from '@cashu/cashu-ts';
import { initializeCashuWallet } from 'lib/cashu/util';
import { payInvoice } from '../../../lib/cashu/wallet';
import { getNewProofsToUse } from '../helpers';
import * as ln from '../lightningCli';

describe('payInvoice', () => {
  let wallet: CashuWallet;
  let invoice: string;

  beforeEach(async () => {
    const mintUrl = 'http://localhost:8082';
    wallet = await initializeCashuWallet(mintUrl, 'sat');
    invoice = await ln.createInvoice(1000, { nodeNumber: 2 });
  });

  test('should pay an invoice', async () => {
    const proofs = await getNewProofsToUse(wallet, 1100);
    const invoicePayment = await payInvoice(wallet, invoice, proofs);
    expect(invoicePayment.quote.state).toBe(MeltQuoteState.PAID);
  });

  test('should return total change', async () => {
    const proofs = await getNewProofsToUse(wallet, 1100);
    const invoicePayment = await payInvoice(wallet, invoice, proofs);
    expect(invoicePayment.change.length).toBe(1);
  });
});

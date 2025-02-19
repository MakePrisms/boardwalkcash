import { CashuMint, CashuWallet, type Proof } from '@cashu/cashu-ts';
import { getCrossMintQuotes } from './wallet';

const mint1 = new CashuMint('https://testnut.cashu.space');
const mint2 = new CashuMint('https://nofees.testnut.cashu.space');

const from = new CashuWallet(mint1);
const to = new CashuWallet(mint2);

async function testCrossMintQuotes(amountWeWant: number, totalBalance: number) {
  console.log(`\n====== WE WANT: ${amountWeWant} ======`);

  const quotes = await getCrossMintQuotes(
    from,
    to,
    totalBalance,
    amountWeWant,
  ).catch((e) => {
    console.error(e);
    return null;
  });

  if (!quotes) {
    console.error('Failed to get quotes');
    return;
  }

  const { meltQuote, mintQuote: _ } = quotes;

  const proofsRequired = meltQuote.amount + meltQuote.fee_reserve;

  if (proofsRequired > totalBalance) {
    throw new Error('Rerturned more proofs required than our total balance');
  }

  console.log('got request amount?', meltQuote.amount === amountWeWant);
  console.log('meltQuote', {
    amount: meltQuote.amount,
    fee_reserve: meltQuote.fee_reserve,
  });
  console.log('amountToMint', meltQuote.amount);
  console.log('numProofsRequired', meltQuote.amount + meltQuote.fee_reserve);
  console.log('======================\n\n');
}

const totalBalance = 600;
const amountWeWant = 500;

testCrossMintQuotes(amountWeWant, totalBalance);

export const createMockProofs = (amount: number): Proof[] => {
  const proofs: Proof[] = [];
  let remaining = amount;

  // Find largest power of 2 that fits
  while (remaining > 0) {
    const power = Math.floor(Math.log2(remaining));
    const proofAmount = 2 ** power;

    proofs.push({
      id: '009a1f293253e41e',
      amount: proofAmount,
      secret:
        '407915bc212be61a77e3e6d2aeb4c727980bda51cd06a6afc29e2861768a7837',
      C: '02bc9097997d81afb2cc7346b5e4345a9346bd2a506eb7958598a72f0cf85163ea',
    });

    remaining -= proofAmount;
  }

  return proofs;
};

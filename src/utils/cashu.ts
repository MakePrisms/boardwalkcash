import { CashuWallet, MintQuoteResponse, Proof } from '@cashu/cashu-ts';

/**
 * Only takes needed proofs and puts the rest back to local storage.
 * @param amount Amount in satoshis we want to get proofs for
 * @returns Array of proofs or empty array if not enough proofs
 */
export const getNeededProofs = (amount: number, keysetId?: string, update = true) => {
   const proofs: Proof[] = JSON.parse(window.localStorage.getItem('proofs') || '[]');

   let amountCollected: number = 0;
   const proofsToSend: Proof[] = [];
   const proofsToPutBack: Proof[] = [];

   for (let proof of proofs) {
      if (amountCollected < amount && (!keysetId || proof.id === keysetId)) {
         proofsToSend.push(proof);
         amountCollected += proof.amount;
      } else {
         proofsToPutBack.push(proof);
      }
   }

   if (amountCollected < amount && update) {
      // put everything back
      window.localStorage.setItem('proofs', JSON.stringify([...proofsToPutBack, ...proofsToSend]));
      return [];
   } else if (update) {
      // just put change back
      window.localStorage.setItem('proofs', JSON.stringify([...proofsToPutBack]));
      return proofsToSend;
   } else {
      return proofsToSend;
   }
};

/**
 * Removes proofs from local storage
 * @param proofsToRemove Array of proofs to remove
 */
export const removeProofs = (proofsToRemove: Proof[]) => {
   const proofs: Proof[] = JSON.parse(window.localStorage.getItem('proofs') || '[]');

   const updatedProofs = proofs.filter(
      proof => !proofsToRemove.some(p => p.secret === proof.secret),
   );
   window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));
};

export const addBalance = (proofsToAdd: Proof[]) => {
   if (proofsToAdd.length === 0) return;

   const proofs: Proof[] = JSON.parse(window.localStorage.getItem('proofs') || '[]');

   const updatedProofs = [...proofs, ...proofsToAdd];
   window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));
};

export const customMintQuoteRequest = async (
   amountSat: number,
   amountUsd: number,
   wallet: CashuWallet,
) => {
   const isBitcoinMints = wallet.mint.mintUrl.includes('mint.bitcoinmints.com');
   const isLocalHost = wallet.mint.mintUrl.includes('localhost');
   if (!isBitcoinMints && !isLocalHost) {
      try {
         return await wallet.createMintQuote(amountUsd);
      } catch (error) {
         console.error('Error getting mint quote:', error);
         throw error;
      }
   }

   const usdKeysetId = await wallet.mint
      .getKeys()
      .then(keys => keys.keysets.find(key => key.unit === 'usd')?.id);

   if (!usdKeysetId) {
      throw new Error('No USD keyset found');
   }

   const mintQuoteReq = {
      amount: amountSat,
      keysetId: usdKeysetId,
      unit: 'sat',
   };

   console.log('Mint Quote Request:', mintQuoteReq);

   try {
      const mintQuote = await fetch(`${wallet.mint.mintUrl}/v1/mint/quote/bolt11`, {
         method: 'POST',
         body: JSON.stringify(mintQuoteReq),
         headers: { 'Content-Type': 'application/json' },
      }).then(res => res.json());

      console.log('Mint Quote:', mintQuote);

      return mintQuote as MintQuoteResponse;
   } catch (e) {
      console.error('Error getting mint quote:', e);
      throw e;
   }
};

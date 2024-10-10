import {
   AmountPreference,
   CashuMint,
   CashuWallet,
   MintQuoteResponse,
   Proof,
   Token,
   getDecodedToken,
} from '@cashu/cashu-ts';
import { hashToCurve } from '@cashu/crypto/modules/common';
import { bytesToHex } from '@noble/curves/abstract/utils';
import { sha256 } from '@noble/hashes/sha256';
import { getTokenFromDb } from './appApiRequests';

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

export const proofsLockedTo = (proofs: Proof[]) => {
   const pubkeys = new Set<string>();
   proofs.forEach(({ secret }) => {
      let parsed;
      try {
         parsed = JSON.parse(secret);
      } catch (e) {
         // If parsing fails, assume it's a hex string
         parsed = secret;
      }
      if (Array.isArray(parsed)) {
         if (parsed[0] === 'P2PK') {
            pubkeys.add(parsed[1].data as string);
         } else {
            throw new Error('Unsupported well-known secret');
         }
      }
   });

   if (pubkeys.size > 1) {
      throw new Error(
         'Received a token with multiple pubkeys. This is not supported yet. Please report this.',
      );
   }

   if (pubkeys.size === 1) {
      return Array.from(pubkeys)[0];
   } else {
      return null;
   }
};

export const isTokenSpent = async (token: string | Token) => {
   const decodedToken = typeof token === 'string' ? getDecodedToken(token) : token;

   if (decodedToken.token.length !== 1) {
      throw new Error('Invalid token. Multiple token entries are not supported.');
   }

   const proofs = decodedToken.token[0].proofs;

   const mintUrl = decodedToken.token[0].mint;

   const wallet = new CashuWallet(new CashuMint(mintUrl));

   if (!wallet) {
      throw new Error('No wallet found for this token');
   }

   try {
      const spent = await wallet.checkProofsSpent(proofs);
      return spent.length > 0;
   } catch (e) {
      console.error(e);
      return false;
   }
};

/**
 * Checks if multiple tokens are spent across different mints.
 *
 * @param tokenEntries - An array of tuples, each containing a token ID and either a token string or Token object.
 * @returns A Promise that resolves to an object where keys are token IDs and values are booleans indicating if the token is spent.
 *
 * @throws {Error} If any token has multiple token entries, which are not supported.
 *
 * @example
 * const tokenEntries = [
 *   ['id1', 'tokenString1'],
 *   ['id2', tokenObject2]
 * ];
 * const spentStatus = await areTokensSpent(tokenEntries);
 * // spentStatus might look like: { id1: true, id2: false }
 */
export const areTokensSpent = async (tokenEntries: [string, string | Token][]) => {
   const mintProofs: { [mintUrl: string]: Proof[] } = {};
   const tokenMap: { [proofSecret: string]: boolean } = {};
   const idToProofSecrets: { [id: string]: string[] } = {};

   // Group proofs by mint URL
   tokenEntries.forEach(([id, token]) => {
      const decodedToken = typeof token === 'string' ? getDecodedToken(token) : token;
      if (decodedToken.token.length !== 1) {
         throw new Error('Invalid token. Multiple token entries are not supported.');
      }
      const mintUrl = decodedToken.token[0].mint;
      const proofs = decodedToken.token[0].proofs;

      if (!mintProofs[mintUrl]) mintProofs[mintUrl] = [];
      mintProofs[mintUrl].push(...proofs);

      idToProofSecrets[id] = proofs.map(proof => proof.secret);
      proofs.forEach(proof => {
         tokenMap[proof.secret] = false;
      });
   });

   // Check proofs for each mint
   for (const [mintUrl, proofs] of Object.entries(mintProofs)) {
      const wallet = new CashuWallet(new CashuMint(mintUrl));
      try {
         const spentProofs = await wallet.checkProofsSpent(proofs);
         spentProofs.forEach(proof => {
            tokenMap[proof.secret] = true;
         });
      } catch (e) {
         console.error(`Error checking proofs for mint ${mintUrl}:`, e);
      }
   }

   // Map results back to original IDs
   const results: [string, boolean][] = tokenEntries.map(([id, _]) => [
      id,
      idToProofSecrets[id].some(secret => tokenMap[secret]),
   ]);

   return Object.fromEntries(results);
};

/**
 * Attempts to initialize a wallet
 * @param mintUrl mint url
 * @param opts options to init keyset for
 * @throws Error if mint does not support specified options or if no options are provided
 * @returns instance of CashuWallet with matching keyset
 */
export const initializeWallet = async (
   mintUrl: string,
   opts: { unit?: string; keysetId?: string },
) => {
   if (!opts.unit && !opts.keysetId) {
      throw new Error('Either unit or keysetId must be specified');
   }

   const mint = new CashuMint(mintUrl);
   const keys = await mint.getKeys();

   let matchingKeyset;

   if (opts.unit && opts.keysetId) {
      matchingKeyset = keys.keysets.find(key => key.id === opts.keysetId && key.unit === opts.unit);
   } else if (opts.keysetId) {
      matchingKeyset = keys.keysets.find(key => key.id === opts.keysetId);
   } else if (opts.unit) {
      matchingKeyset = keys.keysets.find(
         key => key.unit === opts.unit && /^[0-9A-Fa-f]+$/.test(key.id),
      );
   }

   if (!matchingKeyset) {
      console.error(opts);
      throw new Error(`No matching keyset found for mint ${mintUrl} with specified options`);
   }

   return new CashuWallet(mint, { keys: matchingKeyset });
};

export const getProofsFromToken = (token: Token | string) => {
   const decodedToken = typeof token === 'string' ? getDecodedToken(token) : token;
   return decodedToken.token[0].proofs;
};

export function computeTxId(tx: Array<Proof> | string | Token): string {
   const proofs: Array<Proof> = !Array.isArray(tx) ? getProofsFromToken(tx) : tx;
   const enc = new TextEncoder();
   const Ys = proofs.map(p => hashToCurve(enc.encode(p.secret)).toRawBytes(true));
   Ys.sort((a, b) => {
      for (let i = 0; i < a.length; i++) {
         if (a[i] !== b[i]) {
            return a[i] - b[i]; // descending order
         }
      }
      return 0;
   });
   const hasher = sha256.create();
   // concatenate Ys and hash
   for (const y of Ys) {
      hasher.update(y);
   }
   const hash = hasher.digest();
   return bytesToHex(hash);
}

/**
 * Finds the largest amounts that fit into target amount
 * @param targetAmount amount that preferences should sum to
 * @returns
 */
const calculateBasicPreference = (targetAmount: number): AmountPreference[] => {
   const preference: AmountPreference[] = [];
   let remaining = targetAmount;

   // Find the largest power of 2 that fits within the target amount
   const maxPower = Math.floor(Math.log2(remaining));

   for (let i = maxPower; i >= 0; i--) {
      const amount = Math.pow(2, i);
      if (amount <= remaining) {
         const count = Math.floor(remaining / amount);
         preference.push({ amount, count });
         remaining -= amount * count;
      }
   }

   return preference;
};

/**
 * Creates amount preferences so there are two sets of proofs, one for fee and one for amount
 * @param fee amount 1
 * @param amount  amount 2
 * @returns
 */
export function createPreferredProofsForFee(fee: number, amount: number) {
   const feePreference: Array<AmountPreference> = [];
   const amountPreference: Array<AmountPreference> = [];

   feePreference.push(...calculateBasicPreference(fee));
   amountPreference.push(...calculateBasicPreference(amount));

   return { feePreference, amountPreference };
}

/**
 * Extract proofs from a list of proofs that match the preference
 * @param proofs
 * @param preference
 * @returns
 */
export function getProofsForPreference(proofs: Proof[], preference: AmountPreference[]) {
   const preferredProofs: Proof[] = [];

   for (const { amount, count } of preference) {
      const proofsForAmount = proofs.filter(p => p.amount === amount);
      if (proofsForAmount.length < count) {
         throw new Error('Not enough proofs for preference');
      }
      preferredProofs.push(...proofsForAmount.slice(0, count));
   }

   return preferredProofs;
}

export const getTokenFromUrl = async (url: string) => {
   try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      const token = params.get('token');
      const txid = params.get('txid');

      if (token && token.startsWith('cashu')) {
         return token;
      }

      if (txid) {
         return (await getTokenFromDb(txid)).token;
      }

      return null;
   } catch (error) {
      console.error('Invalid URL:', error);
      return null;
   }
};

export const getMintFromToken = (token: string | Token) => {
   const decodedToken = typeof token === 'string' ? getDecodedToken(token) : token;
   return decodedToken.token[0].mint;
};

export const isTestMint = (url: string) => {
   return url.includes('test');
};

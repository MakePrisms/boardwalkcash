import { ec as EC } from 'elliptic';
import { randomBytes } from 'crypto';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { splitAmount } from '@cashu/cashu-ts/dist/lib/es5/utils';
import { BlindedMessage } from '@cashu/cashu-ts/dist/lib/es5/model/BlindedMessage';
import {
   BlindedMessageData,
   Keys,
   MintKeys,
   Proof,
   SerializedBlindedMessage,
   SerializedBlindedSignature,
} from '@cashu/cashu-ts';
import { bytesToHex } from '@noble/curves/abstract/utils';
import {
   blindMessage,
   constructProofFromPromise,
   serializeProof,
} from '@cashu/crypto/modules/client';
import { pointFromHex } from '@cashu/crypto/modules/common';

const ec = new EC('secp256k1');

// A workaround function to get a curve point from x
// This does NOT properly hash to curve, but avoids invalid point errors
function getCurvePointFromX(x: string) {
   // Use x to generate a key pair (as a deterministic workaround)
   const keyPair = ec.keyFromPrivate(x, 'hex');
   return keyPair.getPublic();
}

export function constructProofs(
   promises: Array<SerializedBlindedSignature>,
   rs: Array<bigint>,
   secrets: Array<Uint8Array>,
   keyset: MintKeys,
): Array<Proof> {
   return promises
      .map((p: SerializedBlindedSignature, i: number) => {
         const blindSignature = { id: p.id, amount: p.amount, C_: pointFromHex(p.C_) };
         const r = rs[i];
         const secret = secrets[i];
         const A = pointFromHex(keyset.keys[p.amount]);
         return constructProofFromPromise(blindSignature, r, secret, A);
      })
      .map(p => serializeProof(p) as Proof);
}

// Generate a blinded message for a given amount
export function createBlindedMessages(amount: number, keys: MintKeys): BlindedMessageData {
   const amounts = splitAmount(amount, keys.keys);
   const blindedMessages: Array<SerializedBlindedMessage> = [];
   const secrets: Array<Uint8Array> = [];
   const rs: Array<bigint> = [];
   for (let i = 0; i < amounts.length; i++) {
      const secretBytes = new TextEncoder().encode(bytesToHex(randomBytes(32)));

      secrets.push(secretBytes);

      const { B_, r } = blindMessage(secretBytes);
      rs.push(r);

      const blindedMessage = new BlindedMessage(amounts[i], B_, keys.id);
      blindedMessages.push(blindedMessage.getSerializedBlindedMessage());
   }
   return { blindedMessages, rs, secrets };
}

export function unblindSignature(
   blindedSignature: string,
   blindingFactor: string,
   mintPublicKey: string,
) {
   // Convert the mint's public key from hex to an elliptic curve public key object
   const K = ec.keyFromPublic(mintPublicKey, 'hex').getPublic();

   // Convert the hexadecimal blinding factor back into a BigNumber or appropriate elliptic curve private key format
   const r = new EC('secp256k1').keyFromPrivate(blindingFactor, 'hex').getPrivate();

   // Decode the blinded signature from hex to an elliptic curve point
   const C_ = ec.curve.decodePoint(blindedSignature, 'hex');

   // Perform the elliptic curve multiplication operation using the blinding factor
   let rK;
   try {
      rK = K.mul(r);
   } catch (error) {
      console.error('Error during multiplication:', error);
      throw new Error('Failed to multiply K and r due to invalid BigNumber representation.');
   }

   // Subtract the blinding factor times the public key from the blinded signature to unblind it
   const C = C_.add(rK.neg());

   // Return the unblinded signature as a hexadecimal string
   return C.encode('hex', false);
}

export const generateKeyPair = () => {
   const key: Uint8Array = generateSecretKey();
   const pubkey = getPublicKey(key);
   const privkey = Buffer.from(new Uint8Array(key)).toString('hex');
   return {
      pubkey,
      privkey,
   };
};

export const calculateSha256 = async (blob: Blob): Promise<string> => {
   const buffer = await blob.arrayBuffer();
   const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
   const hashArray = Array.from(new Uint8Array(hashBuffer));
   const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
   return hashHex;
};

export const randomHex = (length: number) => {
   return bytesToHex(randomBytes(length));
};

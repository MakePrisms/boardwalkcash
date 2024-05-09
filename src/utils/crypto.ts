import { ec as EC } from 'elliptic';
import { randomBytes } from 'crypto';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

const ec = new EC('secp256k1');

// A workaround function to get a curve point from x
// This does NOT properly hash to curve, but avoids invalid point errors
function getCurvePointFromX(x: string) {
   // Use x to generate a key pair (as a deterministic workaround)
   const keyPair = ec.keyFromPrivate(x, 'hex');
   return keyPair.getPublic();
}

// Generate a blinded message for a given amount
export function generateBlindedMessagesForAmount(amount: number, keysetId: string) {
   const x = randomBytes(32).toString('hex');
   const Y = getCurvePointFromX(x);

   // Generate a new key pair for blinding factor 'r'
   const rKeyPair = ec.genKeyPair();
   const r = rKeyPair.getPrivate();

   const G = ec.g;
   const rG = G.mul(r);
   const B_ = Y.add(rG);

   // Return blinded message and the blinding factor 'r'
   return {
      blindedMessage: {
         amount,
         id: keysetId,
         B_: B_.encode('hex', false),
      },
      blindingFactor: r.toString(16), // Return 'r' as a hex string
   };
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
   const privkey = Buffer.from(key).toString('hex');
   return {
      pubkey,
      privkey,
   };
};

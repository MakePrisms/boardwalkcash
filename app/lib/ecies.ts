/**
 * ECIES (Elliptic Curve Integrated Encryption Scheme) is a public-key encryption scheme that uses elliptic curve cryptography.
 *
 * This is an implementation of ECIES using the secp256k1 curve, ChaCha20-Poly1305 for encryption, and HKDF for key derivation.
 *
 * ## How it works:
 * - **Asymmetric**: Encrypt with recipient's public key, decrypt with their private key
 * - **Ephemeral keys**: Each message generates a new temporary key pair for forward secrecy
 * - **Hybrid approach**: Uses ECDH to create shared secret, then symmetric encryption for efficiency
 * - **Self-contained**: Ephemeral public key travels with the encrypted message
 *
 * The official specification is in [SEC 1: Elliptic Curve Cryptography Version 2.0](https://www.secg.org/sec1-v2.pdf) section 5.1
 *
 * This implementaiton is based on https://github.com/ecies/js
 */

import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { secp256k1 } from '@noble/curves/secp256k1';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

/**
 * ECIES encrypt data to a public key
 * @param data - Data to encrypt
 * @param publicKeyBytes - 32-byte (Schnorr x-only) or 33-byte (compressed) public key
 * @returns Encrypted message: [ephemeralPubKey(33) || nonce(12) || ciphertext || tag(16)]
 */
export function eciesEncrypt(
  data: Uint8Array,
  publicKeyBytes: Uint8Array,
): Uint8Array {
  // Step 1: Parse and validate the recipient's public key
  const recipientPublicKey = parsePublicKey(publicKeyBytes);

  // Step 2: Generate ephemeral key pair
  const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
  const ephemeralPubKey =
    secp256k1.ProjectivePoint.fromPrivateKey(ephemeralPrivKey);

  // Step 3: Compute shared secret using ECDH
  const sharedSecret = getSharedSecret(
    ephemeralPrivKey,
    recipientPublicKey.toRawBytes(true),
  );

  // Step 4: Derive encryption and authentication keys using HKDF
  const { encryptionKey, nonce } = deriveKeys(sharedSecret);

  // Step 5: Encrypt with ChaCha20-Poly1305
  const encrypted = encrypt(data, encryptionKey, nonce);

  // Step 6: Construct final message
  const ephemeralPublicKeyBytes = ephemeralPubKey.toRawBytes(true); // 33 bytes compressed
  const result = new Uint8Array(
    ephemeralPublicKeyBytes.length + nonce.length + encrypted.length,
  );

  let offset = 0;
  result.set(ephemeralPublicKeyBytes, offset);
  offset += ephemeralPublicKeyBytes.length;
  result.set(nonce, offset);
  offset += nonce.length;
  result.set(encrypted, offset);

  return result;
}

/**
 * ECIES decrypt data with a private key
 * @param encryptedData - Encrypted message from eciesEncrypt()
 * @param privateKeyBytes - 32-byte private key
 * @returns Decrypted plaintext
 */
export function eciesDecrypt(
  encryptedData: Uint8Array,
  privateKeyBytes: Uint8Array,
): Uint8Array {
  if (privateKeyBytes.length !== 32) {
    throw new Error('Private key must be 32 bytes');
  }

  // Step 1: Parse the encrypted message components
  const ephemeralPubKeyBytes = encryptedData.slice(0, 33);
  const nonce = encryptedData.slice(33, 45);
  const ciphertext = encryptedData.slice(45);

  // Step 2: Reconstruct ephemeral public key
  const ephemeralPubKey =
    secp256k1.ProjectivePoint.fromHex(ephemeralPubKeyBytes);

  // Step 3: Compute shared secret using recipient's private key
  const sharedSecret = getSharedSecret(
    privateKeyBytes,
    ephemeralPubKey.toRawBytes(true),
  );

  // Step 4: Re-derive the same keys
  const { encryptionKey, nonce: derivedNonce } = deriveKeys(sharedSecret);

  if (!arraysEqual(nonce, derivedNonce)) {
    throw new Error('Nonce mismatch - possible corruption or tampering');
  }

  // Step 5: Decrypt
  return decrypt(ciphertext, encryptionKey, nonce);
}

function parsePublicKey(publicKeyBytes: Uint8Array) {
  if (publicKeyBytes.length === 32) {
    // Schnorr-style x-only public key - lift to full point
    return secp256k1.ProjectivePoint.fromHex(
      `02${Array.from(publicKeyBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`,
    );
  }

  if (publicKeyBytes.length === 33) {
    // Compressed public key
    return secp256k1.ProjectivePoint.fromHex(publicKeyBytes);
  }

  if (publicKeyBytes.length === 65) {
    // Uncompressed public key
    return secp256k1.ProjectivePoint.fromHex(publicKeyBytes);
  }

  throw new Error('Invalid public key length');
}

function getSharedSecret(
  privateKeyBytes: Uint8Array,
  publicKeyBytes: Uint8Array,
) {
  return secp256k1.getSharedSecret(privateKeyBytes, publicKeyBytes).slice(1); // Remove parity byte
}

function deriveKeys(sharedSecret: Uint8Array) {
  // Empty salt so we don't have to store it in the payload. The ephemeral key is sufficiently random.
  const salt = new Uint8Array(0);
  const info = new TextEncoder().encode('ecies-key-derivation');
  const keyMaterial = hkdf(sha256, sharedSecret, salt, info, 44); // 32 + 12 bytes

  return {
    encryptionKey: keyMaterial.slice(0, 32),
    nonce: keyMaterial.slice(32, 44),
  };
}

function encrypt(
  data: Uint8Array,
  encryptionKey: Uint8Array,
  nonce: Uint8Array,
) {
  const cipher = chacha20poly1305(encryptionKey, nonce);
  return cipher.encrypt(data);
}

function decrypt(
  data: Uint8Array,
  encryptionKey: Uint8Array,
  nonce: Uint8Array,
) {
  const cipher = chacha20poly1305(encryptionKey, nonce);
  return cipher.decrypt(data);
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

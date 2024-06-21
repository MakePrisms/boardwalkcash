import { Wallet } from '@/types';
import { createBlindedMessages } from '@/utils/crypto';
import { Proof, SerializedBlindedMessage, SerializedBlindedSignature } from '@cashu/cashu-ts';
import { constructProofs } from '@cashu/cashu-ts/dist/lib/es5/DHKE';
import NDK, { NDKEvent, NDKKind, NDKPrivateKeySigner, NostrEvent } from '@nostr-dev-kit/ndk';
import { nip04 } from 'nostr-tools';

export const useNostrMintConnect = () => {
   const parseUri = (uri: string) => {
      const url = uri.replace('nostr+mintconnect://', 'https://');
      const urlParts = new URL(url);

      const privateKey = urlParts.searchParams.get('secret');

      if (!privateKey) {
         throw new Error('Private key not found in connection URI');
      }

      const signerPubkey = urlParts.hostname;

      if (!signerPubkey) {
         throw new Error('Signer pubkey not found in connection URI');
      }

      const relays = urlParts.searchParams.getAll('relay');

      if (!relays || relays.length === 0) {
         throw new Error('Relays not found in connection URI');
      }

      const mintUrl = urlParts.searchParams.get('mintUrl');

      if (!mintUrl) {
         throw new Error('Mint URL not found in connection URI');
      }

      return { privateKey, relays, signerPubkey, mintUrl };
   };

   const sendRequest = async <T>(uri: string, method: string, params: any): Promise<T> => {
      const { privateKey, relays, signerPubkey, mintUrl } = parseUri(uri);

      const requestContent = {
         id: Math.floor(Math.random() * 1000000).toString(),
         method,
         params,
      };

      const encryptedContent = await nip04.encrypt(
         privateKey,
         signerPubkey,
         JSON.stringify(requestContent),
      );

      const requestEvent = new NDKEvent(undefined, {
         kind: 23294,
         content: encryptedContent,
         tags: [['p', signerPubkey]],
      } as NostrEvent);

      await requestEvent.sign(new NDKPrivateKeySigner(privateKey));

      const res = await fetch(`${mintUrl}/nostr-mint-connect/request`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(requestEvent.rawEvent()),
      });

      if (!res.ok) {
         const error = await res.text();
         const errMsg = JSON.parse(error).error || error;
         throw new Error(`${errMsg}`);
      }

      const response = await res.json();

      return response.result as T;
   };

   const requestSignatures = async (
      uri: string,
      blindedMessages: SerializedBlindedMessage[],
   ): Promise<SerializedBlindedSignature[]> => {
      return sendRequest<SerializedBlindedSignature[]>(uri, 'issue_tokens', blindedMessages);
   };

   const requestVerification = async (uri: string, proof: Proof): Promise<boolean> => {
      return sendRequest<boolean>(uri, 'cashu_verify', proof);
   };

   const requestDeposit = async (
      uri: string,
      amount: number,
      unit = 'usd',
   ): Promise<{ invoice: string; payment_hash: string }> => {
      return sendRequest<{ invoice: string; payment_hash: string }>(uri, 'deposit', {
         amount,
         unit,
      });
   };

   const checkDeposit = async (uri: string, paymentHash: string): Promise<boolean> => {
      const { paid } = await sendRequest<{ paid: boolean }>(uri, 'deposit_status', {
         payment_hash: paymentHash,
      });

      return paid;
   };

   const createProofsFromReserve = async (
      uri: string,
      amount: number,
      keyset: Wallet,
   ): Promise<Proof[]> => {
      const { blindedMessages, secrets, rs } = createBlindedMessages(amount, keyset.keys.id);

      const blindedSignatures = await requestSignatures(uri, blindedMessages);

      const proofs = constructProofs(blindedSignatures, rs, secrets, keyset.keys);

      return proofs;
   };

   return {
      requestSignatures,
      requestVerification,
      requestDeposit,
      checkDeposit,
      createProofsFromReserve,
   };
};
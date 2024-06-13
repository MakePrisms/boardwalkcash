import { Proof, SerializedBlindedMessage, SerializedBlindedSignature } from '@cashu/cashu-ts';
import NDK, { NDKEvent, NDKKind, NDKPrivateKeySigner, NostrEvent } from '@nostr-dev-kit/ndk';
import { nip04 } from 'nostr-tools';

export const useRemoteSigner = () => {
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

      return { privateKey, relays, signerPubkey };
   };

   const sendRequest = async <T>(uri: string, method: string, params: any): Promise<T> => {
      const { privateKey, relays, signerPubkey } = parseUri(uri);

      const ndk = new NDK({ explicitRelayUrls: relays });
      ndk.signer = new NDKPrivateKeySigner(privateKey);

      await ndk.connect().then(() => console.log('Connected to NDK'));

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

      const requestEvent = new NDKEvent(ndk, {
         kind: 23294,
         content: encryptedContent,
         tags: [['p', signerPubkey]],
      } as NostrEvent);

      await requestEvent.sign();

      const filter = {
         kinds: [23295 as unknown as NDKKind],
         '#p': [requestEvent.pubkey],
         authors: [signerPubkey],
         since: requestEvent.created_at || 0,
      };

      console.log('response filter', filter);

      const sub = ndk.subscribe(filter);

      return new Promise(async (resolve, reject) => {
         sub.on('event', async event => {
            console.log('received event', event.rawEvent());
            try {
               const decryptedContent = await nip04.decrypt(
                  privateKey,
                  event.pubkey,
                  event.content,
               );

               const response = JSON.parse(decryptedContent);

               console.log('decrypted response', response);

               if (response.id !== requestContent.id) {
                  return;
               }

               resolve(response.result as T);

               sub.stop();
            } catch (error) {
               reject(error);
            }
         });

         try {
            await requestEvent.publish();
         } catch (error) {
            reject(error);
         }
      });
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

   const requestDeposit = async (uri: string, amount: number): Promise<string> => {
      return sendRequest<string>(uri, 'deposit', { amount });
   };

   return { requestSignatures, requestVerification, requestDeposit };
};

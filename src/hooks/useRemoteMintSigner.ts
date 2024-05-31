import {
   RemoteMintSignerState,
   SignerConnection,
   addRemoteMintSigner,
} from '@/redux/slices/RemoteMintSignerSlice';
import { RootState } from '@/redux/store';
import { Proof, SerializedBlindedMessage, SerializedBlindedSignature } from '@cashu/cashu-ts';
import { pointFromHex, serializeMintKeys } from '@cashu/crypto/modules/common';
import { createBlindSignature, createNewMintKeys, verifyProof } from '@cashu/crypto/modules/mint';
import NDK, { NDKEvent, NDKKind, NDKPrivateKeySigner, NostrEvent } from '@nostr-dev-kit/ndk';
import { generateSecretKey, getPublicKey, nip04 } from 'nostr-tools';
import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNDK } from './useNDK';

const relays = ['wss://relay.primal.net'];

export const useRemoteMintSigner = () => {
   const dispatch = useDispatch();

   const connections = useSelector((state: RootState) => state.remoteMintSigner.connections);
   const connectionsRef = useRef(connections);
   connectionsRef.current = connections;
   const { privkey: walletPrivateKey, pubkey: walletPublicKey } = useSelector(
      (state: RootState) => state.user,
   );

   const { subscribeAndHandle, publishNostrEvent } = useNDK();

   const createSigner = () => {
      if (!walletPublicKey) throw new Error('Wallet keypair not initialized');

      const { id, privateKeys, publicKeys } = createKeyset('usd');

      const { connectionToken, authorizedPubkey } = createConnectionToken(walletPublicKey, relays);

      console.log('Creating signer', { id, privateKeys, connectionToken });

      dispatch(
         addRemoteMintSigner({
            keysetId: id,
            privateKeys,
            publicKeys,
            authorizedPubkey,
         }),
      );

      return { connectionToken, keysetId: id, publicKeys };
   };

   // connection token: bunker://<remote-user-pubkey>?relay=<wss://relay-to-connect-on>&relay=<wss://another-relay-to-connect-on>&secret=<optional-secret-value>
   const createConnectionToken = (remotePubkey: string, relays: string[]) => {
      const secretBytes = generateSecretKey();
      const pubkeyHex = getPublicKey(secretBytes);
      const secret = Buffer.from(secretBytes).toString('hex');
      const connectionToken = `bunker://${remotePubkey}?${relays.map(relay => `relay=${relay}`).join('&')}&secret=${secret}`;
      return { connectionToken, authorizedPubkey: pubkeyHex };
   };

   const createKeyset = (unit: 'sat' | 'usd') => {
      const pow2height = 64;
      const seed = generateSecretKey(); // TODO : store seed in localstorage so that the same keyset can be recreated

      const { keysetId, privKeys, pubKeys } = createNewMintKeys(pow2height, seed);

      const privKeyStrings = serializeMintKeys(privKeys);

      const pubKeyStrings = serializeMintKeys(pubKeys);

      return { id: keysetId, privateKeys: privKeyStrings, publicKeys: pubKeyStrings };
   };

   const requestHandlers = useRef(
      new Map<
         'cashu_verify' | 'cashu_sign',
         (params: any, connection: SignerConnection) => Promise<any>
      >(),
   );

   useEffect(() => {
      requestHandlers.current.set('cashu_verify', cashuVerify);
      requestHandlers.current.set('cashu_sign', cashuSign);
   }, []);

   const deserializeProof = (proof: Proof) => {
      return {
         ...proof,
         secret: new TextEncoder().encode(proof.secret),
         C: pointFromHex(proof.C),
      };
   };

   const cashuVerify = useCallback(
      async (proofs: Proof[] | Proof, connection: SignerConnection) => {
         // Ensure proofs is an array
         const proofsArray = Array.isArray(proofs) ? proofs : [proofs];

         const keysetId = proofsArray[0].id;

         // Ensure all proofs are for the same keyset
         if (proofsArray.some(proof => proof.id !== keysetId)) {
            throw new Error('All proofs must be for the same keyset');
         }

         let allValid = true;
         for (const proof of proofsArray) {
            const privateKeyString = connection.privateKeys[proof.amount];
            const privateKey = Buffer.from(privateKeyString, 'hex');

            const valid = verifyProof(deserializeProof(proof), privateKey);
            if (!valid) {
               console.error('Invalid proof:', proof);
               allValid = false;
               break;
            }
         }

         return allValid;
      },
      [],
   );

   const cashuSign = useCallback(
      async (
         outputs: SerializedBlindedMessage[],
         connection: SignerConnection,
      ): Promise<SerializedBlindedSignature[]> => {
         const blindedSigPromises = outputs.map(async output => {
            const keysetId = output.id;
            const B_ = pointFromHex(output.B_);
            const privateKeyString = connection.privateKeys[output.amount];
            const privateKey = Buffer.from(privateKeyString, 'hex');
            const { C_ } = createBlindSignature(B_, privateKey, output.amount, output.id);
            return { id: output.id, C_: C_.toHex(true), amount: output.amount };
         });

         const blindedSigs = await Promise.all(blindedSigPromises);
         return blindedSigs;
      },
      [],
   );

   const validateConnection = useCallback(
      (event: NDKEvent, method: string, params: any) => {
         const connection = connectionsRef.current[event.pubkey];

         if (!connection) {
            console.error('Invalid connection');
            return;
         }

         const keysetId = Array.isArray(params) ? params[0].id : params.id;

         if (keysetId !== connection.keysetId) {
            console.error('Invalid keyset ID');
            return;
         }

         return connection;
      },
      [connectionsRef],
   );

   const handleRequest = useCallback(
      async (event: NDKEvent, walletPrivateKey: string) => {
         const decrypted = await nip04.decrypt(walletPrivateKey, event.pubkey, event.content);

         if (!decrypted) {
            console.error('Failed to decrypt');
            return;
         }

         console.log('Decrypted:', decrypted);

         const request = JSON.parse(decrypted);

         console.log('Response:', request);

         const { id, method, params } = request;

         const handler = requestHandlers.current.get(method);

         if (!handler) {
            console.error('Invalid signer method');
            return;
         }

         const connection = validateConnection(event, method, params);

         if (!connection) {
            console.error('Invalid connection');
            return;
         }

         const response = await handler(params, connection);

         console.log('Response:', response);

         const encryptedResponse = await nip04.encrypt(
            walletPrivateKey,
            event.pubkey,
            JSON.stringify({ id, result: response }),
         );

         const responseEvent = {
            kind: NDKKind.NostrConnect,
            pubkey: walletPublicKey,
            content: encryptedResponse,
            tags: [['p', event.pubkey]],
         } as NostrEvent;

         await publishNostrEvent(responseEvent);
      },
      [walletPublicKey, publishNostrEvent, validateConnection],
   );

   const subscribeAndHandleRemoteSignerRequests = async () => {
      if (!walletPrivateKey || !walletPublicKey) return;

      const filter = {
         kinds: [NDKKind.NostrConnect],
         '#p': [walletPublicKey],
         since: Math.floor(Date.now() / 1000),
      };

      await subscribeAndHandle(
         filter,
         (event: NDKEvent) => handleRequest(event, walletPrivateKey),
         undefined,
         relays,
      );
   };

   return { createSigner, subscribeAndHandleRemoteSignerRequests };
};

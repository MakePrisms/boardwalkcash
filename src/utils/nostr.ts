import { NostrError } from '@/types';
import { hexToBytes } from '@noble/curves/abstract/utils';
import NDK, {
   NDKEvent,
   NDKKind,
   NDKPrivateKeySigner,
   NDKRelay,
   NDKRelaySet,
   NDKTag,
   NostrEvent,
} from '@nostr-dev-kit/ndk';
import { getPublicKey, nip04, nip19, nip44 } from 'nostr-tools';
import { generateKeyPair } from './crypto';

const defaultRelays = [
   'wss://nostr.mutinywallet.com',
   'wss://relay.mutinywallet.com',
   'wss://relay.snort.social',
   'wss://nos.lol',
   'wss://nostr.fmt.wiz.biz',
   'wss://relay.damus.io',
   'wss://relay.primal.net',
   'wss://nostr.wine',
   'wss://relay.nostr.band',
   'wss://nostr.zbd.gg',
   'wss://relay.nos.social',
];

const initializeNDK = async (relays = defaultRelays) => {
   console.log('initializing NDK with relays', relays);
   let privkey;
   if (typeof window !== 'undefined') {
      /* Running in browser */
      privkey = window.localStorage.getItem('privkey');
   } else {
      /* Running on server */
      privkey = process.env.BOARDWALK_NOSTR_PRIVKEY;
   }
   if (privkey?.startsWith('nsec1')) {
      privkey = nip19.decode(privkey).data as string;
   }
   if (!privkey) {
      throw new Error('Boardwalk Nostr private key not found');
   }

   const ndk = new NDK({
      explicitRelayUrls: defaultRelays,
      signer: new NDKPrivateKeySigner(privkey),
   });

   await ndk.connect().catch(() => {
      throw new NostrError('Failed to connect to NDK');
   });
   const privkeyBytes = hexToBytes(privkey);
   const pubkey = getPublicKey(privkeyBytes);

   return { ndk, privkey: privkeyBytes, pubkey };
};

export const sendOtp = async (sendTo: { pubkey: string }, otp: string) => {
   const { ndk, privkey } = await initializeNDK();

   const dmEvent = {
      kind: NDKKind.EncryptedDirectMessage,
      content: await nip04.encrypt(privkey, sendTo.pubkey, otp),
      tags: [['p', sendTo.pubkey]],
   } as NostrEvent;

   await publishNostrEvent(ndk, dmEvent, undefined);
};

export const getNostrContacts = async (pubkey: string) => {
   const { ndk } = await initializeNDK();

   let contactEvents: Set<NDKEvent> = new Set();

   /* get all contact list events until timeout */
   const fetchEventsPromise = new Promise<Set<NDKEvent>>(resolve => {
      const sub = ndk.subscribe(
         {
            kinds: [NDKKind.Contacts],
            authors: [pubkey],
         },
         { closeOnEose: false, groupable: false },
      );

      sub.on('event', (event: NDKEvent) => {
         contactEvents.add(event);
      });

      setTimeout(() => {
         sub.stop();
         resolve(contactEvents);
      }, 3000);
   });

   try {
      contactEvents = await fetchEventsPromise;
   } catch (error) {
      console.error('Error fetching contact events:', error);
   }

   if (contactEvents.size === 0) {
      return [];
   }

   const mostRecentEvent = Array.from(contactEvents).reduce((latest, current) => {
      return current.created_at! > latest.created_at! ? current : latest;
   });

   const contactsPubkeys = mostRecentEvent.getMatchingTags('p').map((tag: NDKTag) => tag[1]);
   return contactsPubkeys;
};

export const sendNip04DM = async (nprofile: string, content: string) => {
   const decoded = nip19.decode(nprofile);
   if (decoded.type !== 'nprofile') {
      throw new Error('Failed to decode nprofile');
   }
   const { pubkey, relays } = decoded.data;
   const { ndk, privkey } = await initializeNDK(relays);
   const encryptedContent = await nip04.encrypt(privkey, pubkey, content);

   const dmEvent = {
      kind: NDKKind.EncryptedDirectMessage,
      content: encryptedContent,
      tags: [['p', pubkey]],
   } as NostrEvent;

   console.log('publishing event', dmEvent);
   await publishNostrEvent(ndk, dmEvent, relays);
};

const randomTimeUpTo2DaysInThePast = () => {
   return Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 172800);
};

export const sendNip17DM = async (nprofile: string, content: string) => {
   const decoded = nip19.decode(nprofile);
   if (decoded.type !== 'nprofile') {
      throw new Error('Failed to decode nprofile');
   }
   const { pubkey: receiverPubkey, relays } = decoded.data;

   console.log('sending DM to', receiverPubkey);
   console.log('relays', relays);

   const { ndk, privkey, pubkey: senderPubkey } = await initializeNDK(relays);

   const msgEvent = new NDKEvent(undefined, {
      kind: 14,
      pubkey: senderPubkey,
      created_at: Math.floor(Date.now() / 1000),
      content,
      tags: [['p', receiverPubkey]],
   } as NostrEvent);
   msgEvent.id = msgEvent.getEventHash();

   const convoKey = nip44.getConversationKey(privkey, receiverPubkey);

   const sealEvent = new NDKEvent(ndk, {
      kind: 13,
      tags: [],
      pubkey: senderPubkey,
      created_at: randomTimeUpTo2DaysInThePast(),
      content: nip44.encrypt(JSON.stringify(msgEvent), convoKey),
   } as NostrEvent);
   await sealEvent.sign();

   const { privkey: randPrivkey, pubkey: randPubkey } = generateKeyPair();
   const giftConvoKey = nip44.getConversationKey(hexToBytes(randPrivkey), receiverPubkey);

   const giftWrapEvent = new NDKEvent(ndk, {
      kind: 1059,
      pubkey: randPubkey,
      created_at: randomTimeUpTo2DaysInThePast(),
      content: nip44.encrypt(JSON.stringify(sealEvent), giftConvoKey),
      tags: [['p', receiverPubkey]],
   });
   await giftWrapEvent.sign(new NDKPrivateKeySigner(randPrivkey));

   await giftWrapEvent
      .publish()
      .then(() => console.log('sent gift wrap event', giftWrapEvent.rawEvent()));
};

export const publishNostrEvent = async (ndk: NDK, event: NostrEvent, relays?: string[]) => {
   ndk.assertSigner();

   const e = new NDKEvent(ndk, event);

   if (relays) {
      const relaySet = new NDKRelaySet(new Set(relays.map(r => new NDKRelay(r))), ndk);
      for await (const r of relaySet.relays) {
         await r.connect();
      }
      await e.publish(relaySet).catch(e => {
         console.error('Failed to publish event', e);
         throw new NostrError(e.message);
      });
   } else {
      await e.publish().catch(e => {
         console.error('Failed to publish event', e);
         throw new NostrError(e.message);
      });
   }
};

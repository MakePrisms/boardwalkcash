import NDK, {
   NDKEvent,
   NDKKind,
   NDKPrivateKeySigner,
   NDKRelay,
   NDKRelaySet,
   NDKTag,
   NostrEvent,
} from '@nostr-dev-kit/ndk';
import { nip04 } from 'nostr-tools';

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

const initializeNDK = async () => {
   const privkey = process.env.BOARDWALK_NOSTR_PRIVKEY;
   if (!privkey) {
      throw new Error('Boardwalk Nostr private key not found');
   }

   const ndk = new NDK({
      explicitRelayUrls: defaultRelays,
      signer: new NDKPrivateKeySigner(privkey),
   });

   await ndk.connect().then(() => console.log('Connected to NDK'));
   return { ndk, privkey };
};

export const sendOtp = async (sendTo: { pubkey: string }, otp: string) => {
   const { ndk, privkey } = await initializeNDK();

   const user = ndk.getUser(sendTo);

   /* make sure the user exists */
   const userProfile = await user.fetchProfile();
   if (!userProfile) {
      throw new Error('Failed to fetch user profile from Nostr');
   }
   /* if user has relays, prefer those */
   const { relayUrls } = user;
   let relays: string[] | undefined;
   if (relayUrls.length > 0) {
      relays = relayUrls;
   }

   const dmEvent = {
      kind: NDKKind.EncryptedDirectMessage,
      content: await nip04.encrypt(privkey, sendTo.pubkey, otp),
      tags: [['p', sendTo.pubkey]],
   } as NostrEvent;

   await publishNostrEvent(ndk, dmEvent, relays);
};

export const getNostrContacts = async (pubkey: string) => {
   const { ndk } = await initializeNDK();

   const contactEvent = await ndk.fetchEvent({
      kinds: [NDKKind.Contacts],
      authors: [pubkey],
   });

   if (!contactEvent) {
      return [];
   }

   const contactsPubkeys = contactEvent.getMatchingTags('p').map((tag: NDKTag) => tag[1]);
   return contactsPubkeys;
};

export const publishNostrEvent = async (ndk: NDK, event: NostrEvent, relays?: string[]) => {
   ndk.assertSigner();

   const e = new NDKEvent(ndk, event);

   if (relays) {
      const relaySet = new NDKRelaySet(new Set(relays.map(r => new NDKRelay(r))), ndk);
      for await (const r of relaySet.relays) {
         await r.connect();
      }
      await e.publish(relaySet);
   } else {
      await e.publish();
   }
};

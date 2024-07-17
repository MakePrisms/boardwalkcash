import { NDKEvent } from '@nostr-dev-kit/ndk';
import { nip04 } from 'nostr-tools';
import { useNDK } from './useNDK';
import { generateKeyPair, randomHex } from '@/utils/crypto';

type NWAResponse = {
   secret: string;
   relay?: string;
   lud16?: string;
   walletPubkey?: string; // not part of the spec, used for Alby nwa wrapper
};

export type SupportedWallet = {
   name: string;
   nwaUrl: string;
   relay: string;
   listenRelay: string;
   meta: {
      icon: string | null;
      color: string;
   };
};

const requiredNwcCommands = 'pay_invoice make_invoice lookup_invoice get_info get_balance';

const nwaWrapperBase = 'https://nwa.makeprisms.com';

const supportedWallets: SupportedWallet[] = [
   {
      name: 'Alby',
      nwaUrl: 'https://nwc.getalby.com/apps/new',
      relay: 'wss://relay.getalby.com/v1', // relay for the NWC
      listenRelay: 'wss://relay.primal.net', // relay to listen to nwa responses
      meta: {
         icon: null,
         color: '#000000',
      },
   },
];

const useNwa = () => {
   const { subscribe } = useNDK();

   const getNwcUrl = async (wallet: SupportedWallet) => {
      const { privkey, pubkey } = generateKeyPair();

      const { url: nwaUrl, nwaSecret } = newConnectUrl(wallet, pubkey);

      const sub = await subscribeToNwa(wallet.listenRelay, pubkey);

      window.open(nwaUrl, '_blank');

      return new Promise<{ nwcUrl: string }>((resolve, reject) => {
         sub.on('event', async (event: NDKEvent) => {
            console.log('Received NWA response:', event.rawEvent());
            try {
               const decrypted = await decryptResponse(event, privkey);

               if (decrypted.secret !== nwaSecret) return;

               const walletPubkey = decrypted.walletPubkey || event.pubkey;
               const relay = decrypted.relay || wallet.relay;

               const nwcUrl = `nostr+walletconnect://${walletPubkey}?relay=${relay}&pubkey=${pubkey}&secret=${privkey}`;

               console.log('nwcUrl:', nwcUrl);

               const lnAddress = decrypted.lud16 || null;

               console.log('emitting nwaResponse');
               resolve({ nwcUrl });
            } catch (err) {
               console.error('Error handling NWA response:', err);
               reject(err);
            }
         });
      });
   };

   const buildNwaUrl = (wallet: SupportedWallet) => {
      throw new Error('Not implemented');
      // if (!this.walletChoice) throw new Error('No wallet provided');
      // const base = `nostr+walletauth://${this.nwaDetails.publicKey}`;
      // const params = new URLSearchParams({
      //    relay: this.walletChoice.listenRelay!,
      //    secret: this.nwaDetails.secret,
      //    required_commands: this.nwaDetails.requiredCommands,
      //    // budget: `${this.nwaDetails.budget}/day`,
      //    identity: this.nwaDetails.identity, // app identity or user pubkey?
      // }).toString();

      // return `${base}?${params}`;
   };

   const buildAlbyRedirectUrl = (pubkey: string, nwaSecret: string) => {
      return `${nwaWrapperBase}/api/alby-redirect?userPubkey=${pubkey}&nwaSecret=${nwaSecret}`;
   };

   const newConnectUrl = (wallet: SupportedWallet, pubkey: string) => {
      const nwaSecret = randomHex(32);

      if (wallet.name === 'Alby') {
         const redirectUrl = buildAlbyRedirectUrl(pubkey, nwaSecret);

         const params = new URLSearchParams({
            name: 'Boardwalk',
            pubkey: pubkey,
            request_methods: requiredNwcCommands,
            // max_amount:
            // budget_renewal" 'daily',
            return_to: redirectUrl,
         });

         return { url: `${wallet.nwaUrl}?${params.toString()}`, nwaSecret };
      }
      return { url: buildNwaUrl(wallet), nwaSecret };
   };

   const subscribeToNwa = async (relay: string, pubkey: string) => {
      const NWAFilter = {
         kinds: [33194],
         '#d': [pubkey],
         since: Math.round(Date.now() / 1000),
      };

      return subscribe(NWAFilter, undefined, [relay]);
   };

   const decryptResponse = async (event: NDKEvent, privkey: string): Promise<NWAResponse> => {
      const decrypted = await nip04.decrypt(privkey, event.pubkey, event.content);

      if (!decrypted) {
         throw new Error('Failed to decrypt NWA response');
      }

      try {
         const parsed = JSON.parse(decrypted);

         if (!parsed || typeof parsed !== 'object' || !parsed.secret) {
            throw new Error();
         }

         return parsed as NWAResponse;
      } catch (e) {
         throw new Error('Invalid NWA response.');
      }
   };

   return {
      getNwcUrl,
      supportedWallets,
   };
};

export default useNwa;

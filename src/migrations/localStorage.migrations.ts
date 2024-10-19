import { HistoryState } from '@/redux/slices/HistorySlice';
import { Wallet as StoredKeyset } from '@/types';
import { CashuMint, Proof } from '@cashu/cashu-ts';

type Migration = {
   version: number;
   migrate: () => void;
   reload: boolean;
};

const migrations: Array<Migration> = [
   /* add unit to all old lightning transactions */
   {
      version: 1,
      migrate: () => {
         /* add unit to all old lightning transactions */
         const persistRoot = JSON.parse(localStorage.getItem('persist:root') || '{}');
         const history = JSON.parse(persistRoot.history || '{}') as HistoryState | undefined;

         if (!history) return;

         // Ensure history has the correct initial state
         const updatedHistory: HistoryState = {
            ecash: Array.isArray(history.ecash) ? history.ecash : [],
            lightning: Array.isArray(history.lightning) ? history.lightning : [],
            mintless: Array.isArray(history.mintless) ? history.mintless : [],
         };

         // Add unit to all old lightning transactions
         updatedHistory.lightning = updatedHistory.lightning.map(tx => {
            if (tx['unit'] === undefined) {
               return { ...tx, unit: 'usd' };
            }
            return tx;
         });

         persistRoot.history = JSON.stringify(updatedHistory);
         localStorage.setItem('persist:root', JSON.stringify(persistRoot));
      },
      reload: false,
   },
   /* add 'sat' keysets for any added mints */
   {
      version: 2,
      migrate: async () => {
         const keysets = JSON.parse(localStorage.getItem('keysets') || '[]') as StoredKeyset[];
         const byMint = new Map<string, StoredKeyset[]>();
         keysets.forEach(k => {
            if (!byMint.has(k.url)) {
               byMint.set(k.url, []);
            }
            byMint.get(k.url)!.push(k);
         });
         const mintsWithoutSatKeysets = Array.from(byMint.keys()).filter(url => {
            const keysets = byMint.get(url)!;
            return keysets.some(k => k.keys.unit !== 'sat');
         });
         const satKeysets: StoredKeyset[] = await Promise.all(
            mintsWithoutSatKeysets.map(async url => {
               try {
                  const mint = new CashuMint(url);
                  const { keysets } = await mint.getKeys();
                  const satKeyset = keysets.find(
                     k => k.unit === 'sat' && /^[0-9A-Fa-f]+$/.test(k.id),
                  );
                  if (!satKeyset) return null;
                  return {
                     id: satKeyset.id,
                     keys: satKeyset,
                     unit: 'sat',
                     url,
                     isReserve: false,
                     active: false,
                     proofs: [] as Proof[],
                  };
               } catch (error) {
                  console.error(`Failed to get keys for mint ${url}:`, error);
                  return null;
               }
            }),
         ).then(res => res.filter(k => k !== null) as StoredKeyset[]);
         if (satKeysets.length === 0) return;
         const activeUsdKeyset = keysets.find(k => k.keys.unit === 'usd' && k.active);
         let matchingSatKeyset = satKeysets.find(k => k.url === activeUsdKeyset?.url);
         if (matchingSatKeyset) {
            matchingSatKeyset.active = true;
         } else if (satKeysets.length > 0) {
            satKeysets[0].active = true;
            matchingSatKeyset = satKeysets[0];
         }
         const allKeysets = [...keysets, ...satKeysets];
         localStorage.setItem('keysets', JSON.stringify(allKeysets));

         // Set default wallets
         const defaultWallets: { [key: string]: string } = {};
         if (activeUsdKeyset) {
            defaultWallets['usd'] = activeUsdKeyset.id;
         }
         if (matchingSatKeyset) {
            defaultWallets['sat'] = matchingSatKeyset.id;
         }
         localStorage.setItem('defaultWallets', JSON.stringify(defaultWallets));
      },
      reload: true,
   },
   {
      version: 3,
      migrate: async () => {
         const persistRoot = JSON.parse(localStorage.getItem('persist:root') || '{}');
         const history = JSON.parse(persistRoot.history || '{}');

         if (!history.mintless) {
            history.mintless = [];
            persistRoot.history = JSON.stringify(history);
            localStorage.setItem('persist:root', JSON.stringify(persistRoot));
         }
      },
      reload: true,
   },
   /* version 1 migration was sometimes breaking tx history (fixed now), so this will recover any apps that have a broken history */
   {
      version: 4,
      migrate: () => {
         const persistRoot = localStorage.getItem('persist:root');
         if (persistRoot) {
            const parsedRoot = JSON.parse(persistRoot);
            const history = JSON.parse(parsedRoot.history || '{}');

            const updatedHistory: HistoryState = {
               ecash: Array.isArray(history.ecash) ? history.ecash : [],
               lightning: Array.isArray(history.lightning) ? history.lightning : [],
               mintless: Array.isArray(history.mintless) ? history.mintless : [],
            };

            parsedRoot.history = JSON.stringify(updatedHistory);
            localStorage.setItem('persist:root', JSON.stringify(parsedRoot));
         }
      },
      reload: false,
   },
];

export const runMigrations = async () => {
   const currentVersion = Number(localStorage.getItem('storageVersion') || 0);

   for await (const migration of migrations) {
      if (migration.version > currentVersion) {
         await migration.migrate();
         localStorage.setItem('storageVersion', migration.version.toString());
         migration.reload && window.location.reload();
      }
   }
};

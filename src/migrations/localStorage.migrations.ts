import { HistoryState } from '@/redux/slices/HistorySlice';

type Migration = {
   version: number;
   migrate: () => void;
};

const migrations: Array<Migration> = [
   {
      version: 1,
      migrate: () => {
         /* add unit to all old lightning transactions */
         const persistRoot = JSON.parse(localStorage.getItem('persist:root') || '{}');
         const history = JSON.parse(persistRoot.history || '{}') as HistoryState | undefined;

         if (!history) return;
         const lightningTransactions = history.lightning;
         if (!Array.isArray(lightningTransactions)) return;
         const newLightningTransactions = lightningTransactions.map(tx => {
            if (tx['unit'] === undefined) {
               return { ...tx, unit: 'usd' };
            }
            return tx;
         });

         const updatedHistory = { ...history, lightning: newLightningTransactions };
         persistRoot.history = JSON.stringify(updatedHistory);
         localStorage.setItem('persist:root', JSON.stringify(persistRoot));
      },
   },
];

export const runMigrations = async () => {
   const currentVersion = Number(localStorage.getItem('storageVersion') || 0);

   migrations.forEach((migration, index) => {
      if (migration.version > currentVersion) {
         migration.migrate();
         localStorage.setItem('storageVersion', migration.version.toString());
      }
   });
};

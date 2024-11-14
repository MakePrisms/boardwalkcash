import { Currency } from '@/types';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export enum TxStatus {
   PENDING = 'PENDING',
   PAID = 'PAID',
   FAILED = 'FAILED',
}

export interface EcashTransaction {
   amount: number;
   token: string;
   mint: string;
   date: string;
   status: TxStatus;
   unit: 'sat' | 'usd';
   appName?: string; // used for nwc connections
   isReserve?: boolean;
   pubkey?: string;
   gift?: string; // should deprecate, but will break existing history
   giftId: number | null;
   fee?: number;
}

export interface LightningTransaction {
   amount: number;
   date: string;
   status: TxStatus;
   mint: string | null; // null for mintless
   quote: string | null; // null for mintless
   unit: 'usd' | 'sat';
   memo?: string;
   appName?: string;
}

export interface MintlessTransaction {
   type: 'mintless';
   amount: number;
   gift: string | null;
   unit: Currency;
   date: string;
}

export type Transaction = EcashTransaction | LightningTransaction | MintlessTransaction;

export interface HistoryState {
   ecash: EcashTransaction[];
   lightning: LightningTransaction[];
   mintless: MintlessTransaction[];
}

const initialState: HistoryState = {
   ecash: [],
   lightning: [],
   mintless: [],
};

export const isEcashTransaction = (transaction: Transaction): transaction is EcashTransaction => {
   return (transaction as EcashTransaction).token !== undefined;
};

export const isLightningTransaction = (
   transaction: Transaction,
): transaction is LightningTransaction => {
   return (transaction as LightningTransaction).quote !== undefined;
};

export const isMintlessTransaction = (
   transaction: Transaction,
): transaction is MintlessTransaction => {
   if ('type' in transaction && transaction.type === 'mintless') {
      return true;
   }
   return false;
};

const historySlice = createSlice({
   name: 'history',
   initialState,
   reducers: {
      addTransaction: (
         state,
         action: PayloadAction<{
            type: 'ecash' | 'lightning' | 'reserve' | 'mintless';
            transaction: Transaction;
         }>,
      ) => {
         const { type, transaction } = action.payload;
         if (type === 'ecash' && isEcashTransaction(transaction)) {
            state.ecash.push(transaction);
         } else if (type === 'lightning' && isLightningTransaction(transaction)) {
            if (!transaction.unit) {
               throw new Error('Lightning transactions must have a unit');
            }
            state.lightning.push(transaction);
         } else if (type === 'reserve' && isEcashTransaction(transaction)) {
            state.ecash.push({ ...transaction, isReserve: true });
         } else if (type === 'mintless' && isMintlessTransaction(transaction)) {
            if (!Array.isArray(state.mintless)) {
               state.mintless = [];
            }
            state.mintless.push(transaction);
         }
      },
      addPendingLightningTransaction: (
         state,
         action: PayloadAction<{
            transaction: Omit<LightningTransaction, 'status' | 'date'>;
         }>,
      ) => {
         state.lightning.push({
            ...action.payload.transaction,
            status: TxStatus.PENDING,
            date: new Date().toLocaleString(),
         });
      },
      updateTransactionStatus: (
         state,
         action: PayloadAction<{
            type: 'ecash' | 'lightning';
            quote?: string;
            token?: string;
            status: TxStatus;
         }>,
      ) => {
         const { type, quote, token, status } = action.payload;
         if (type === 'ecash' && token) {
            const transaction = state.ecash.find(t => t.token === token);

            if (transaction) {
               transaction.status = status;
            } else {
               console.error('Transaction not found when updating status', token);
            }
         } else if (type === 'lightning' && quote) {
            const transaction = state.lightning.find(t => t.quote === quote);
            if (transaction) {
               transaction.status = status;
            } else {
               console.error('Transaction not found when updating status', quote);
            }
         } else {
            console.error('Invalid transaction type or missing quote or token');
         }
      },
      deleteLightningTransaction: (state, action: PayloadAction<string>) => {
         state.lightning = state.lightning.filter(t => t.quote !== action.payload);
      },
   },
});

export const {
   addTransaction,
   updateTransactionStatus,
   addPendingLightningTransaction,
   deleteLightningTransaction,
} = historySlice.actions;

export default historySlice.reducer;

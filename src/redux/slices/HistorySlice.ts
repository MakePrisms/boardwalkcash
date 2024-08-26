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
   appName?: string;
   isReserve?: boolean;
   pubkey?: string;
   gift?: string;
   fee?: boolean;
}

export interface LightningTransaction {
   amount: number;
   date: string;
   status: TxStatus;
   mint: string;
   quote: string;
   memo?: string;
   appName?: string;
   pubkey?: string;
}

export type Transaction = EcashTransaction | LightningTransaction;

interface HistoryState {
   ecash: EcashTransaction[];
   lightning: LightningTransaction[];
}

const initialState: HistoryState = {
   ecash: [],
   lightning: [],
};

export const isEcashTransaction = (
   transaction: LightningTransaction | EcashTransaction,
): transaction is EcashTransaction => {
   return (transaction as EcashTransaction).token !== undefined;
};

export const isLightningTransaction = (
   transaction: LightningTransaction | EcashTransaction,
): transaction is LightningTransaction => {
   return (transaction as LightningTransaction).quote !== undefined;
};

const historySlice = createSlice({
   name: 'history',
   initialState,
   reducers: {
      addTransaction: (
         state,
         action: PayloadAction<{
            type: 'ecash' | 'lightning' | 'reserve';
            transaction: LightningTransaction | EcashTransaction;
         }>,
      ) => {
         const { type, transaction } = action.payload;
         if (type === 'ecash' && isEcashTransaction(transaction)) {
            state.ecash.push(transaction);
         } else if (type === 'lightning' && isLightningTransaction(transaction)) {
            state.lightning.push(transaction);
         } else if (type === 'reserve' && isEcashTransaction(transaction)) {
            state.ecash.push({ ...transaction, isReserve: true });
         }
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
   },
});

export const { addTransaction, updateTransactionStatus } = historySlice.actions;

export default historySlice.reducer;

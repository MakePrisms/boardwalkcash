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
}

export interface LightningTransaction {
   amount: number;
   date: string;
   status: TxStatus;
   mint: string;
   quote: string;
   memo?: string;
   appName?: string;
}

interface HistoryState {
   ecash: EcashTransaction[];
   lightning: LightningTransaction[];
}

const initialState: HistoryState = {
   ecash: [],
   lightning: [],
};

const isEcashTransaction = (
   transaction: LightningTransaction | EcashTransaction,
): transaction is EcashTransaction => {
   return (transaction as EcashTransaction).token !== undefined;
};

const isLightningTransaction = (
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
            type: 'ecash' | 'lightning';
            transaction: LightningTransaction | EcashTransaction;
         }>,
      ) => {
         const { type, transaction } = action.payload;
         if (type === 'ecash' && isEcashTransaction(transaction)) {
            if (state.ecash.find(t => t.token === transaction.token)) {
               return;
            }
            state.ecash.push(transaction);
         } else if (type === 'lightning' && isLightningTransaction(transaction)) {
            if (state.lightning.find(t => t.quote === transaction.quote)) {
               return;
            }
            state.lightning.push(transaction);
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

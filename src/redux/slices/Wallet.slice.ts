import { MintKeys, Proof } from '@cashu/cashu-ts';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Wallet } from '@/types';
import { RootState } from '../store';

const updateKeysetLocalStorage = (keysets: { [key: string]: Wallet }) => {
   localStorage.setItem('keysets', JSON.stringify(Object.values(keysets)));
};

interface WalletState {
   balance: { [unit: string]: number };
   balanceLocked: boolean;
   keysets: { [key: string]: Wallet };
}

const initialState: WalletState = {
   balance: {},
   balanceLocked: false,
   keysets: {},
};

export const initializeKeysets = createAsyncThunk<{ keysets: Wallet[]; balance: { usd: number } }>(
   'wallet/initializeKeysets',
   async (_, { rejectWithValue }) => {
      const keysets = JSON.parse(localStorage.getItem('keysets') || '[]') as Wallet[];
      const proofs = JSON.parse(localStorage.getItem('proofs') || '[]') as Proof[];
      const balance = proofs.reduce(
         (acc, proof) => {
            acc.usd += proof.amount;
            return acc;
         },
         { usd: 0 },
      );
      return { keysets, balance };
   },
);

export const setMainKeyset = createAsyncThunk(
   'wallet/setMainKeyset',
   async (keysetId: string, { getState, dispatch }) => {
      const state = getState() as RootState;

      const toSetMain = state.wallet.keysets[keysetId];

      if (!toSetMain) {
         throw new Error('Keyset not found');
      }

      if (toSetMain.active) {
         console.log('This keyset is already active.');
         return;
      }

      try {
         const pubkey = localStorage.getItem('pubkey');
         console.log('Posting to /api/users/', pubkey);
         await fetch(`/api/users/${pubkey}`, {
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mintUrl: toSetMain.url, pubkey }),
         });
      } catch (e) {
         throw new Error(`Failed to update user: ${e}`);
      }

      return { keysetId, active: true };
   },
);

interface UpdateKeysetStatusPayload {
   id: string;
   active?: boolean;
   isReserve?: boolean;
}

export const walletSlice = createSlice({
   name: 'walletSlice',
   initialState,
   reducers: {
      updateKeysetStatus: (state, action: PayloadAction<UpdateKeysetStatusPayload>) => {
         const { id, active, isReserve } = action.payload;
         const keyset = state.keysets[id];
         if (!keyset) {
            throw new Error("Keyset doesn't exist.");
            
         }
         if (active !== undefined) {
            keyset.active = active;
         }
         if (isReserve !== undefined) {
            keyset.isReserve = isReserve;
         }
      },
      setBalance: (state, action: PayloadAction<{ [unit: string]: number }>) => {
         if (state.balanceLocked) {
            return;
         }
         state.balance = action.payload;
      },
      lockBalance: state => {
         state.balanceLocked = true;
      },
      unlockBalance: state => {
         state.balanceLocked = false;
      },
      addKeyset: (
         state,
         action: PayloadAction<{
            keyset: MintKeys;
            url: string;
            active?: boolean;
            isReserve?: boolean;
         }>,
      ) => {
         const { keyset, url } = action.payload;
         const toAdd: Wallet = {
            id: keyset.id,
            keys: keyset,
            proofs: [],
            url,
            active: action.payload.active || false,
            isReserve: action.payload.isReserve || false,
         };
         const newKeysetState = { ...state.keysets, [keyset.id]: toAdd };
         state.keysets = newKeysetState;
         updateKeysetLocalStorage(newKeysetState);
      },
   },
   extraReducers: builder => {
      builder
         .addCase(
            initializeKeysets.fulfilled,
            (state, action: PayloadAction<{ keysets: Wallet[]; balance: { usd: number } }>) => {
               state.keysets = action.payload.keysets.reduce(
                  (acc, keyset) => {
                     acc[keyset.id] = keyset;
                     return acc;
                  },
                  {} as { [key: string]: Wallet },
               );
               state.balance = action.payload.balance;
            },
         )
         .addCase(setMainKeyset.fulfilled, (state, action) => {
            if (!action.payload) return;
            const { keysetId, active = true } = action.payload;
            const keyset = state.keysets[keysetId];
            if (keyset) {
               keyset.active = active;
               Object.values(state.keysets).forEach(k => {
                  if (k.id !== keysetId) {
                     k.active = false;
                  }
               });
               updateKeysetLocalStorage(state.keysets);
            }
         });
   },
});

export const { setBalance, lockBalance, unlockBalance, addKeyset, updateKeysetStatus } =
   walletSlice.actions;

export default walletSlice.reducer;

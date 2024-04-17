import { MintKeys, MintKeyset, Proof } from '@cashu/cashu-ts';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Wallet } from '@/types';
import { act } from 'react-dom/test-utils';

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

export const initializeKeysets = createAsyncThunk<{ keysets: Wallet[] }>(
   'wallet/initializeKeysets',
   async (_, { rejectWithValue }) => {
      const keysets = JSON.parse(localStorage.getItem('keysets') || '[]') as Wallet[];
      return { keysets };
   },
);

export const walletSlice = createSlice({
   name: 'walletSlice',
   initialState,
   reducers: {
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
      addKeyset: (state, action: PayloadAction<{ keyset: MintKeys; url: string }>) => {
         const { keyset, url } = action.payload;
         // const active = Object.keys(state.keysets).length > 0 ? false : true;
         const active = true;
         const toAdd: Wallet = { id: keyset.id, keys: keyset, proofs: [], url, active };
         const newKeysetState = { ...state.keysets, [keyset.id]: toAdd };
         state.keysets = newKeysetState;
         updateKeysetLocalStorage(newKeysetState);
      },
   },
   extraReducers: builder => {
      builder.addCase(
         initializeKeysets.fulfilled,
         (state, action: PayloadAction<{ keysets: Wallet[] }>) => {
            state.keysets = action.payload.keysets.reduce(
               (acc, keyset) => {
                  acc[keyset.id] = keyset;
                  return acc;
               },
               {} as { [key: string]: Wallet },
            );
         },
      );
   },
});

export const { setBalance, lockBalance, unlockBalance, addKeyset } = walletSlice.actions;

export default walletSlice.reducer;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NwcConnection {
   pubkey: string;
   budget: number;
   expiry: number;
   spent: number;
   appName: string;
   permissions: string[];
   mintUrl?: string;
   createdAt: number;
}

export interface NwcState {
   connections: { [pubkey: string]: NwcConnection };
   allPubkeys: string[];
   lastReqTimestamp: number;
}

const initialState: NwcState = { connections: {}, allPubkeys: [], lastReqTimestamp: 0 };

export const nwcSlice = createSlice({
   name: 'nwcSlice',
   initialState,
   reducers: {
      addNwcConnection: (
         state,
         action: PayloadAction<{ connection: NwcConnection; pubkey: string }>,
      ) => {
         if (!state.allPubkeys) {
            state.allPubkeys = []; // Ensure allPubkeys is always an array
         }
         if (!state.connections) {
            state.connections = {}; // Ensure connections is always an object
         }
         if (state.allPubkeys.includes(action.payload.pubkey)) {
            throw new Error('Connection already exists');
         } else {
            state.allPubkeys.push(action.payload.pubkey);
            state.connections[action.payload.pubkey] = action.payload.connection;
         }
      },
      deleteNwcConnection: (state, action: PayloadAction<string>) => {
         if (state.allPubkeys.includes(action.payload)) {
            state.allPubkeys = state.allPubkeys.filter(pubkey => pubkey !== action.payload);
            delete state.connections[action.payload];
         } else {
            throw new Error('Connection does not exist');
         }
      },
      setLastNwcReqTimestamp: (state, action: PayloadAction<number>) => {
         state.lastReqTimestamp = action.payload;
      },
      incrementConnectionSpent: (
         state,
         action: PayloadAction<{ pubkey: string; spent: number }>,
      ) => {
         state.connections[action.payload.pubkey].spent += action.payload.spent;
      },
   },
});

export const {
   addNwcConnection,
   deleteNwcConnection,
   setLastNwcReqTimestamp,
   incrementConnectionSpent,
} = nwcSlice.actions;

export default nwcSlice.reducer;

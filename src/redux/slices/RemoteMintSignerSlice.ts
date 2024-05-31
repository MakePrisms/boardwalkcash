import { MintKeys } from '@cashu/crypto/modules/common';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export type SignerConnection = {
   keysetId: string;
   privateKeys: { [val: string]: string };
   publicKeys: { [val: string]: string };
   authorizedPubkey: string;
};

export interface RemoteMintSignerState {
   connections: {
      [publicKey: string]: SignerConnection;
   };
}

const initialState: RemoteMintSignerState = {
   connections: {},
};

const RemoteMintSignerSlice = createSlice({
   name: 'remoteMintSigner',
   initialState,
   reducers: {
      addRemoteMintSigner: (state, action: PayloadAction<SignerConnection>) => {
         state.connections[action.payload.authorizedPubkey] = action.payload;
      },
   },
});

export const { addRemoteMintSigner } = RemoteMintSignerSlice.actions;

export default RemoteMintSignerSlice.reducer;

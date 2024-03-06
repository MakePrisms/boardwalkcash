import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

interface UserState {
  pubkey: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UserState = {
  pubkey: null,
  status: 'idle',
  error: null,
};

export const initializeUser = createAsyncThunk<
  { pubkey: string } | undefined, // Type of the return value from the thunk
  void, // First argument of the payload creator
  { rejectValue: string } // Types for ThunkAPI parameters
>(
  'user/initializeUser',
  async (_, { rejectWithValue }) => {
    try {
      let storedPrivKey = localStorage.getItem('privkey');
      let storedPubKey = localStorage.getItem('pubkey');

      if (!storedPrivKey || !storedPubKey) {
        const newSecretKey = generateSecretKey();
        const newPubKey = getPublicKey(newSecretKey);
        const newSecretKeyHex = Buffer.from(new Uint8Array(newSecretKey)).toString('hex');

        localStorage.setItem('privkey', newSecretKeyHex);
        localStorage.setItem('pubkey', newPubKey);

        await axios.post(`${process.env.NEXT_PUBLIC_PROJECT_URL}/api/users`, {
          pubkey: newPubKey,
        });

        return { pubkey: newPubKey }; // This matches the defined return type
      }
    } catch (error) {
      return rejectWithValue('Error initializing user');
    }
  }
);

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addCase(initializeUser.pending, (state) => {
          state.status = 'loading';
        })
        .addCase(initializeUser.fulfilled, (state, action: PayloadAction<{ pubkey: string } | undefined>) => {
          state.status = 'succeeded';
          if (action.payload) {
            state.pubkey = action.payload.pubkey;
          }
        })
        .addCase(initializeUser.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.error.message ?? null;
        });
    },
  });

export default userSlice.reducer;

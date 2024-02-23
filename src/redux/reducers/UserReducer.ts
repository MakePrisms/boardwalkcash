import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

// Define the shape of the user state
interface UserState {
  pubkey: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Define the initial state with explicit types
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
      // If the keys already exist, you can optionally return them or undefined
      // return { pubkey: storedPubKey };
    } catch (error) {
      return rejectWithValue('Error initializing user');
    }
  }
);

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
      // Your synchronous reducers go here
    },
    extraReducers: (builder) => {
      builder
        .addCase(initializeUser.pending, (state) => {
          state.status = 'loading';
        })
        // Adjusted to handle both { pubkey: string } and undefined payload types
        .addCase(initializeUser.fulfilled, (state, action: PayloadAction<{ pubkey: string } | undefined>) => {
          state.status = 'succeeded';
          // Ensure we only update the state if the payload is not undefined
          if (action.payload) {
            state.pubkey = action.payload.pubkey;
          } else {
            // Optionally handle the case where the payload is undefined
            // For example, you might want to log a message or set the state differently
          }
        })
        .addCase(initializeUser.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.error.message ?? null; // Correctly accessing the error message
        });
    },
  });

export default userSlice.reducer;
// Export any actions if they are defined

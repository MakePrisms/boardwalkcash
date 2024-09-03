import { PublicContact } from '@/types';
import { createUser, fetchUser, updateUser } from '@/utils/appApiRequests';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

interface UserState {
   pubkey?: string;
   privkey?: string;
   username: string;
   contacts: PublicContact[];
   status: 'idle' | 'loading' | 'succeeded' | 'failed';
   error: string | null;
   hideFromLeaderboard: boolean;
}

const initialState: UserState = {
   status: 'idle',
   error: null,
   contacts: [],
   username: '',
   hideFromLeaderboard: false,
};

export const initializeUser = createAsyncThunk<
   | {
        pubkey: string;
        privkey: string;
        username: string;
        contacts: PublicContact[];
        hideFromLeaderboard: boolean;
     }
   | undefined, // Type of the return value from the thunk
   void, // First argument of the payload creator
   { rejectValue: string } // Types for ThunkAPI parameters
>('user/initializeUser', async (_, { rejectWithValue }) => {
   try {
      let storedPrivKey = localStorage.getItem('privkey');
      let storedPubKey = localStorage.getItem('pubkey');

      if (!storedPrivKey || !storedPubKey) {
         const newSecretKey = generateSecretKey();
         const newPubKey = getPublicKey(newSecretKey);
         const newSecretKeyHex = Buffer.from(new Uint8Array(newSecretKey)).toString('hex');

         localStorage.setItem('privkey', newSecretKeyHex);
         localStorage.setItem('pubkey', newPubKey);

         const keysets = JSON.parse(localStorage.getItem('keysets') || '[]');

         if (keysets.length === 0) {
            throw new Error('No keysets were found in local storage.');
         }

         if (keysets.length > 1) {
            throw new Error('Multiple keysets were found in local storage.');
         }

         const defaultMintUrl = keysets[0].url;

         const placeholderUsername = `user-${newPubKey.slice(0, 5)}`;

         const user = await createUser(newPubKey, placeholderUsername, defaultMintUrl);

         const { username, hideFromLeaderboard } = user;

         return {
            pubkey: newPubKey,
            privkey: Buffer.from(newSecretKey).toString('hex'),
            username: username!,
            contacts: [],
            hideFromLeaderboard,
         };
      } else {
         const user = await fetchUser(storedPubKey);

         let { username, contacts, hideFromLeaderboard } = user;

         if (!username) {
            username = `user-${storedPubKey.slice(0, 5)}`;
            await updateUser(storedPubKey, { username });
         }
         return {
            pubkey: storedPubKey,
            privkey: storedPrivKey,
            username,
            contacts: contacts.map((c: any) => c.linkedUser),
            hideFromLeaderboard,
         };
      }
   } catch (error) {
      return rejectWithValue('Error initializing user');
   }
});

const userSlice = createSlice({
   name: 'user',
   initialState,
   reducers: {
      addContactAction(state, action: PayloadAction<PublicContact>) {
         state.contacts.push(action.payload);
      },
      updateUsernameAction(state, action: PayloadAction<string>) {
         state.username = action.payload;
      },
      updateHideFromLeaderboardAction(state, action: PayloadAction<boolean>) {
         state.hideFromLeaderboard = action.payload;
      },
   },
   extraReducers: builder => {
      builder
         .addCase(initializeUser.pending, state => {
            state.status = 'loading';
         })
         .addCase(
            initializeUser.fulfilled,
            (
               state,
               action: PayloadAction<
                  | {
                       pubkey: string;
                       privkey: string;
                       username: string;
                       contacts: PublicContact[];
                       hideFromLeaderboard: boolean;
                    }
                  | undefined
               >,
            ) => {
               state.status = 'succeeded';
               if (action.payload) {
                  state.pubkey = action.payload.pubkey;
                  state.privkey = action.payload.privkey;
                  state.username = action.payload.username;
                  state.contacts = action.payload.contacts;
                  state.hideFromLeaderboard = action.payload.hideFromLeaderboard;
               }
            },
         )
         .addCase(initializeUser.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.error.message ?? null;
         });
   },
});

export const { addContactAction, updateUsernameAction, updateHideFromLeaderboardAction } =
   userSlice.actions;

export default userSlice.reducer;

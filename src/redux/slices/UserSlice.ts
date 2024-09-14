import { PublicContact } from '@/types';
import { createUser, fetchUser, updateUser } from '@/utils/appApiRequests';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

interface UserState {
   pubkey?: string;
   privkey?: string;
   nostrPubkey: string | null;
   username: string;
   contacts: PublicContact[];
   status: 'idle' | 'loading' | 'succeeded' | 'failed';
   error: string | null;
   hideFromLeaderboard: boolean;
   nwcUri: string | null;
   lud16: string | null;
   sendMode: 'mintless' | 'default_mint';
   receiveMode: 'mintless' | 'default_mint';
}

const initialState: UserState = {
   status: 'idle',
   error: null,
   contacts: [],
   username: '',
   hideFromLeaderboard: false,
   nostrPubkey: null,
   nwcUri: null,
   lud16: null,
   sendMode: 'default_mint',
   receiveMode: 'default_mint',
};

export const initializeUser = createAsyncThunk<UserState, void, { rejectValue: string }>(
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

            const keysets = JSON.parse(localStorage.getItem('keysets') || '[]');

            const defaultMintUrl = keysets[0].url;

            const placeholderUsername = `user-${newPubKey.slice(0, 5)}`;

            const user = await createUser(newPubKey, placeholderUsername, defaultMintUrl);

            const { username, hideFromLeaderboard, nostrPubkey, mintlessReceive } = user;

            return {
               pubkey: newPubKey,
               privkey: Buffer.from(newSecretKey).toString('hex'),
               username: username!,
               contacts: [],
               hideFromLeaderboard,
               nostrPubkey,
               nwcUri: null,
               lud16: null,
               sendMode: 'default_mint',
               receiveMode: mintlessReceive ? 'mintless' : 'default_mint',
               status: 'succeeded',

               error: null,
            };
         } else {
            const user = await fetchUser(storedPubKey);

            let { username, contacts, hideFromLeaderboard, nostrPubkey, lud16, mintlessReceive } =
               user;

            if (!username) {
               username = `user-${storedPubKey.slice(0, 5)}`;
               await updateUser(storedPubKey, { username });
            }

            const storedNwcUri = localStorage.getItem('nwcUri') || null;
            const storedSendMode = localStorage.getItem('sendMode') || 'default_mint';

            return {
               pubkey: storedPubKey,
               privkey: storedPrivKey,
               username,
               contacts: contacts.map((c: any) => c.linkedUser),
               hideFromLeaderboard,
               nostrPubkey,
               nwcUri: storedNwcUri,
               lud16,
               sendMode: storedSendMode as 'mintless' | 'default_mint',
               receiveMode: mintlessReceive ? 'mintless' : 'default_mint',
               status: 'succeeded',
               error: null,
            };
         }
      } catch (error) {
         return rejectWithValue('Error initializing user');
      }
   },
);

const userSlice = createSlice({
   name: 'user',
   initialState,
   reducers: {
      addContactAction(state, action: PayloadAction<PublicContact>) {
         state.contacts.push(action.payload);
      },
      deleteContactAction(state, action: PayloadAction<PublicContact>) {
         state.contacts = state.contacts.filter(c => c.pubkey !== action.payload.pubkey);
      },
      updateUsernameAction(state, action: PayloadAction<string>) {
         state.username = action.payload;
      },
      updateHideFromLeaderboardAction(state, action: PayloadAction<boolean>) {
         state.hideFromLeaderboard = action.payload;
      },
      setNostrPubkeyAction(state, action: PayloadAction<string | null>) {
         state.nostrPubkey = action.payload;
      },
      setUserNWCAction(state, action: PayloadAction<string | null>) {
         state.nwcUri = action.payload;
         if (action.payload) {
            localStorage.setItem('nwcUri', action.payload);
         } else {
            localStorage.removeItem('nwcUri');
         }
      },
      setUserLud16Action(state, action: PayloadAction<string | null>) {
         state.lud16 = action.payload;
         if (action.payload) {
            localStorage.setItem('lud16', action.payload);
         } else {
            localStorage.removeItem('lud16');
         }
      },
      setSendModeAction(state, action: PayloadAction<'mintless' | 'default_mint'>) {
         state.sendMode = action.payload;
         localStorage.setItem('sendMode', action.payload);
      },
      setReceiveModeAction(state, action: PayloadAction<'mintless' | 'default_mint'>) {
         state.receiveMode = action.payload;
         localStorage.setItem('receiveMode', action.payload);
      },
   },
   extraReducers: builder => {
      builder
         .addCase(initializeUser.pending, state => {
            state.status = 'loading';
         })
         .addCase(
            initializeUser.fulfilled,
            (state, action: PayloadAction<UserState | undefined>) => {
               state.status = 'succeeded';
               if (action.payload) {
                  state.pubkey = action.payload.pubkey;
                  state.privkey = action.payload.privkey;
                  state.username = action.payload.username;
                  state.contacts = action.payload.contacts;
                  state.hideFromLeaderboard = action.payload.hideFromLeaderboard;
                  state.nostrPubkey = action.payload.nostrPubkey;
                  state.nwcUri = action.payload.nwcUri;
                  state.lud16 = action.payload.lud16;
                  state.sendMode = action.payload.sendMode;
                  state.receiveMode = action.payload.receiveMode;
               }
            },
         )
         .addCase(initializeUser.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.error.message ?? null;
         });
   },
});

export const {
   addContactAction,
   deleteContactAction,
   updateUsernameAction,
   updateHideFromLeaderboardAction,
   setNostrPubkeyAction,
   setUserNWCAction,
   setSendModeAction,
   setReceiveModeAction,
   setUserLud16Action,
} = userSlice.actions;

export default userSlice.reducer;

import { Currency, PublicContact, Wallet } from '@/types';
import { createUser, fetchUser, updateUser } from '@/utils/appApiRequests';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { RootState } from '@/redux/store';

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
   defaultUnit: Currency;
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
   defaultUnit: Currency.SAT,
};

export const initializeUser = createAsyncThunk<UserState, void, { rejectValue: string; state: RootState }>(
   'user/initializeUser',
   async (_, { rejectWithValue, getState }) => {
      try {
         let storedPrivKey = localStorage.getItem('privkey');
         let storedPubKey = localStorage.getItem('pubkey');

         if (!storedPrivKey || !storedPubKey) {
            const newSecretKey = generateSecretKey();
            const newPubKey = getPublicKey(newSecretKey);
            const newSecretKeyHex = Buffer.from(new Uint8Array(newSecretKey)).toString('hex');

            localStorage.setItem('privkey', newSecretKeyHex);
            localStorage.setItem('pubkey', newPubKey);

            const keysets: Wallet[] = JSON.parse(localStorage.getItem('keysets') || '[]');

            const defaultUnit = getState().user.defaultUnit;

            const defaultKeyset = keysets.find(x => x.keys.unit === defaultUnit);
            if (!defaultKeyset) {
               throw new Error(`Cannot find keyset for the currency ${defaultUnit}`);
            }
            const defaultMintUrl = defaultKeyset.url;

            const placeholderUsername = `user-${newPubKey.slice(0, 5)}`;

            const user = await createUser(
               newPubKey,
               placeholderUsername,
               defaultMintUrl,
               defaultUnit,
            );

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
               defaultUnit,

               error: null,
            };
         } else {
            const user = await fetchUser(storedPubKey);

            let {
               username,
               contacts,
               hideFromLeaderboard,
               nostrPubkey,
               lud16,
               mintlessReceive,
               defaultUnit,
            } = user;

            console.log('defaultUnit straigt from user', defaultUnit);

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
               defaultUnit: defaultUnit as Currency,
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
                  state.defaultUnit = action.payload.defaultUnit;
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

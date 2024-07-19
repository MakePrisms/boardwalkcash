import activityReducer from './slices/ActivitySlice';
import { useDispatch } from 'react-redux';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import walletReducer from '@/redux/slices/Wallet.slice';
import userReducer from '@/redux/slices/UserSlice';
import nwcReducer from '@/redux/slices/NwcSlice';
import historyReducer from '@/redux/slices/HistorySlice';
import settingsReducer from '@/redux/slices/SettingsSlice';
import remoteMintSignerReducer from '@/redux/slices/RemoteMintSignerSlice';

const rootReducer = combineReducers({
   wallet: walletReducer,
   activity: activityReducer,
   user: userReducer,
   nwc: nwcReducer,
   history: historyReducer,
   settings: settingsReducer,
   remoteMintSigner: remoteMintSignerReducer,
});

const persistConfig = {
   key: 'root',
   storage,
   whitelist: ['nwc', 'history', 'settings', 'remoteMintSigner'],
};

// const remoteMintSignerPersistConfig = {
//    key: 'remoteMintSigner',
//    storage,
// };

const persistedReducer = persistReducer(persistConfig, rootReducer);
// const persistedRemoteMintSignerReducer = persistReducer(
//    remoteMintSignerPersistConfig,
//    remoteMintSignerReducer,
// );

// const combinedReducer = combineReducers({
//    ...persistedReducer,
//    remoteMintSigner: persistedRemoteMintSignerReducer,
// });

export const store = configureStore({
   reducer: persistedReducer,
   middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
         serializableCheck: false,
      }),
});

export const persistor = persistStore(store);

export type RootState = {
   wallet: ReturnType<typeof walletReducer>;
   activity: ReturnType<typeof activityReducer>;
   user: ReturnType<typeof userReducer>;
   nwc: ReturnType<typeof nwcReducer>;
   history: ReturnType<typeof historyReducer>;
   settings: ReturnType<typeof settingsReducer>;
   remoteMintSigner: ReturnType<typeof remoteMintSignerReducer>;
};
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();

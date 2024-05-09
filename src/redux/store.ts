import activityReducer from './slices/ActivitySlice';
import { useDispatch } from 'react-redux';
import { Storage } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import walletReducer from '@/redux/slices/Wallet.slice';
import userReducer from '@/redux/slices/UserSlice';
import nwcReducer from '@/redux/slices/NwcSlice';

const rootReducer = combineReducers({
   wallet: walletReducer,
   activity: activityReducer,
   user: userReducer,
   nwc: nwcReducer,
});

const persistConfig = {
   key: 'root',
   storage,
   whitelist: ['nwc'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
   reducer: persistedReducer,
   middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
         serializableCheck: false,
      }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();

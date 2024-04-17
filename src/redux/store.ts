import activityReducer from './slices/ActivitySlice';
import { useDispatch } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import walletReducer from '@/redux/slices/Wallet.slice';
import userReducer from '@/redux/slices/UserSlice';

export const store = configureStore({
   reducer: {
      wallet: walletReducer,
      activity: activityReducer,
      user: userReducer,
   },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();

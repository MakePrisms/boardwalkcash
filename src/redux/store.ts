import activityReducer, { ActivityState } from "./slices/ActivitySlice";
import { useDispatch } from 'react-redux';
import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import cashuReducer from '@/redux/slices/CashuSlice';
import userReducer from '@/redux/slices/UserSlice';

export const store = configureStore({
  reducer: {
    cashu: cashuReducer,
    activity: activityReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();

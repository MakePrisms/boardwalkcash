import activityReducer, { ActivityState } from "./reducers/ActivityReducer";
import { useDispatch } from 'react-redux';
import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import cashuReducer from '@/redux/reducers/CashuReducer';
import userReducer from '@/redux/reducers/UserReducer';

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

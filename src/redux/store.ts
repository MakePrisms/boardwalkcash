import { configureStore } from "@reduxjs/toolkit";
import cashuReducer from "@/redux/reducers/CashuReducer"

export interface RootState {
    cashu: {
      balance: number;
    };
  }

export const store = configureStore({
  reducer: {
    cashu: cashuReducer,
  }
});
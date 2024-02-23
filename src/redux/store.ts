import { configureStore } from "@reduxjs/toolkit";
import cashuReducer from "@/redux/reducers/CashuReducer"
import activityReducer, { ActivityState} from "./reducers/ActivityReducer";

export interface RootState {
    cashu: {
      balance: number;
    };
    activity: ActivityState;
  }

export const store = configureStore({
  reducer: {
    cashu: cashuReducer,
    activity: activityReducer,
  }
});
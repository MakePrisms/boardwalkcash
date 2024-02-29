import { createSlice } from "@reduxjs/toolkit";

export const cashuSlice = createSlice({
  name: "cashu",
  initialState: {
    balance: 0,
    balanceLocked: false,
  },
  reducers: {
    setBalance: (state, action) => {
      if (state.balanceLocked) {
        return;
      }
      state.balance = action.payload;
    },
    lockBalance: (state) => {
      state.balanceLocked = true;
    },
    unlockBalance: (state) => {
      state.balanceLocked = false;
    },
  },
});

export const { setBalance, lockBalance, unlockBalance } = cashuSlice.actions;

export default cashuSlice.reducer;
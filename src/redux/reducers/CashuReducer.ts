import { createSlice } from "@reduxjs/toolkit";

export const cashuSlice = createSlice({
  name: "cashu",
  initialState: {
    balance: 0,
  },
  reducers: {
    setBalance: (state, action) => {
      state.balance = action.payload;
    },
  },
});

export const { setBalance } = cashuSlice.actions;

export default cashuSlice.reducer;
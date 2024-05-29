import { PayloadAction, createSlice } from '@reduxjs/toolkit';

interface SettingsState {
   ecashTapsEnabled: boolean;
   defaultTapAmount: number;
}

const initialState: SettingsState = {
   ecashTapsEnabled: false,
   defaultTapAmount: 0,
};

const SettingsSlice = createSlice({
   name: 'settings',
   initialState,
   reducers: {
      setEcashTapsEnabled: (state, action: PayloadAction<boolean>) => {
         state.ecashTapsEnabled = action.payload;
      },
      setDefaultTapAmount: (state, action: PayloadAction<number>) => {
         state.defaultTapAmount = action.payload;
      },
   },
});

export const { setEcashTapsEnabled, setDefaultTapAmount } = SettingsSlice.actions;

export default SettingsSlice.reducer;

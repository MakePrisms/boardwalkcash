import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ActivityState {
  status: 'sending' | 'receiving' | 'success' | 'error' | 'default';
  data: {
    amount?: number;
    message?: string;
  };
}

const initialState: ActivityState = {
  status: 'default',
  data: {},
};

// TODO: consolidate these into one or two actions. 
// processing to handle sending and receiving

// TODO: message queue
const activitySlice = createSlice({
  name: 'activity',
  initialState,
  reducers: {
    setSending: (state, action: PayloadAction<string>) => {
      state.status = 'sending';
      state.data.message = action?.payload || 'Sending...';
    },
    setReceiving: (state, action: PayloadAction<string>) => {
      state.status = 'receiving';
      state.data.message = action?.payload || 'Awaiting payment...';
    },
    setSuccess: (state, action: PayloadAction<number | string>) => {
      state.status = 'success';
      if (typeof action.payload === 'string') {
        state.data.message = action.payload;
        return;
      }
      state.data.amount = action.payload;
      state.data.message = `Sent ${action.payload} sat${action.payload === 1 ? '' : 's'}!`;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.data.message = action.payload || 'An error occurred. Please try again.';
    },
    setNotReceiving: (state) => {
      if (state.status === 'receiving') {
        state.status = 'default';
        state.data = {};
      }
    },
    resetStatus: (state) => {
      state.status = 'default';
      state.data = {};
    }
  },
});

export const {
  setSending,
  setReceiving,
  setSuccess,
  setError,
  setNotReceiving,
  resetStatus,
} = activitySlice.actions;

export default activitySlice.reducer;
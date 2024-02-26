import { createSlice } from "@reduxjs/toolkit";

interface Proof {
  amount: number;
  C: string;
  id: string;
  secret: string;
}

interface CashuState {
  balance: number;
  proofs: Proof[];
}

const getProofsFromLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return JSON.parse(window.localStorage.getItem('proofs') || '[]');
  }
  return [];
};

const saveProofsToLocalStorage = (proofs: Proof[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('proofs', JSON.stringify(proofs));
  }
};


const initialState: CashuState = {
  balance: 0,
  proofs: [],
};

const cashuSlice = createSlice({
  name: "cashu",
  initialState,
  reducers: {
    getBalance: (state) => {
      const proofs = getProofsFromLocalStorage();
      state.balance = proofs.reduce((acc: any, proof: Proof) => acc + proof.amount, 0);
    },
    rewriteProofs: (state, action) => {
      saveProofsToLocalStorage(action.payload);
      state.proofs = action.payload;
      state.balance = action.payload.reduce((acc: any, proof: Proof) => acc + proof.amount, 0);
    }
  },
});

export const { getBalance, rewriteProofs } = cashuSlice.actions;
export default cashuSlice.reducer;

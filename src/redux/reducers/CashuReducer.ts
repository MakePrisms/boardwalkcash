import { createSlice } from "@reduxjs/toolkit";

// Assuming the same interfaces as before
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
  return JSON.parse(window.localStorage.getItem('proofs') || '[]');
};

const saveProofsToLocalStorage = (proofs: Proof[]) => {
  window.localStorage.setItem('proofs', JSON.stringify(proofs));
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
    getProofs: (state) => {
      const proofs = getProofsFromLocalStorage();
      state.proofs = proofs;
      // Calculate and set the new balance here based on latest proofs
      state.balance = proofs.reduce((acc: any, proof: Proof) => acc + proof.amount, 0);
    },
    rewriteProofs: (state, action) => {
      saveProofsToLocalStorage(action.payload);
      state.proofs = action.payload;
      state.balance = action.payload.reduce((acc: any, proof: Proof) => acc + proof.amount, 0);
    },
    updateProofs: (state, action) => {
      console.log('updating proofs', action.payload);
      const existingProofs = getProofsFromLocalStorage();

      // Filter out any new proofs with a 'secret' already present in the existing proofs
      const newProofs = action.payload.filter(
        (newProof: Proof) => !existingProofs.some((existingProof: Proof) => existingProof.secret === newProof.secret)
      );

      // Combine existing proofs with the new, filtered proofs
      const updatedProofs = [...existingProofs, ...newProofs];
      
      // Save merged proofs back to localStorage
      saveProofsToLocalStorage(updatedProofs);
      
      // Update state with merged proofs
      state.proofs = updatedProofs;
      
      // Recalculate balance with updated proofs
      state.balance = updatedProofs.reduce((acc, proof) => acc + proof.amount, 0);
    },
  },
});

export const { getBalance, getProofs, updateProofs, rewriteProofs } = cashuSlice.actions;
export default cashuSlice.reducer;

import { Proof } from "@cashu/cashu-ts";

/**
 * Only takes needed proofs and puts the rest back to local storage.
 * @param amount Amount in satoshis we want to get proofs for
 * @returns Array of proofs or empty array if not enough proofs
 */
export const getNeededProofs = (amount: number) => {
  const proofs: Proof[] = JSON.parse(
    window.localStorage.getItem("proofs") || "[]"
  );


  let amountCollected: number = 0;
  const proofsToSend: Proof[] = [];
  const proofsToPutBack: Proof[] = [];

  for (let proof of proofs) {
    if (amountCollected < amount) {
      proofsToSend.push(proof);
      amountCollected += proof.amount;
    } else {
      proofsToPutBack.push(proof);
    }
  }

  if (amountCollected < amount) {
    // put everything back
    window.localStorage.setItem(
      "proofs",
      JSON.stringify([...proofsToPutBack, ...proofsToSend])
    );
    return [];
  } else {
    // just put change back
    window.localStorage.setItem("proofs", JSON.stringify([...proofsToPutBack]));
    return proofsToSend;
  }
};

export const addBalance = (proofsToAdd: Proof[]) => {
  if (proofsToAdd.length === 0) return;

  const proofs: Proof[] = JSON.parse(window.localStorage.getItem('proofs') || '[]');

  const updatedProofs = [...proofs, ...proofsToAdd];
  window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));
}

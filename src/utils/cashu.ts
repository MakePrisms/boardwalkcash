import { Proof } from "@cashu/cashu-ts";

/**
 * Finds the optimal combination of proofs to reach the desired amount. Only takes needed proofs and puts the rest back to local storage.
 * @param amount Amount in satoshis we want to get proofs for
 * @returns Array of proofs
 */
export const getNeededProofs = (amount: number) => {
  const proofs: Proof[] = JSON.parse(
    window.localStorage.getItem("proofs") || "[]"
  );

  let closestProofs: Proof[] = [];
  let closestSum = -Infinity;

  // First, check if any single proof is big enough
  for (let proof of proofs) {
    if (
      proof.amount >= amount &&
      (closestSum === 0 || proof.amount < closestSum)
    ) {
      closestProofs = [proof];
      closestSum = proof.amount;
    }
  }

  const findClosest = (
    idx: number,
    currentSum: number,
    currentProofs: Proof[]
  ) => {
    // If we are closer this time, update the closest values
    if (
      (currentSum >= amount && currentSum < closestSum) ||
      (currentSum >= amount && closestSum < amount)
    ) {
      closestProofs = [...currentProofs];
      closestSum = currentSum;
    }

    if (idx >= proofs.length) return; // Base case

    // Include next proof
    findClosest(idx + 1, currentSum + proofs[idx].amount, [
      ...currentProofs,
      proofs[idx],
    ]);

    // Exclude next proof
    findClosest(idx + 1, currentSum, currentProofs);
  };

  // Only start the recursive search if we haven't already found a single proof that meets the criteria
  if (closestSum < amount || closestProofs.length > 1) {
    findClosest(0, 0, []);
  }

  console.log(
    "## closest amount",
    closestProofs.reduce((acc, proof) => acc + proof.amount, 0)
  );

  const remainngProofs = proofs.filter(
    (proof) => !closestProofs.includes(proof)
  );

  if (closestSum < amount) {
    // put everything back
    window.localStorage.setItem(
      "proofs",
      JSON.stringify([...remainngProofs, ...closestProofs])
    );
    return [];
  } else {
    // just put change back
    window.localStorage.setItem("proofs", JSON.stringify([...remainngProofs]));
    return closestProofs;
  }
};

export const updateStoredProofs = (proofsToAdd: Proof[]) => {
  if (proofsToAdd.length === 0) return;

  const proofs: Proof[] = JSON.parse(window.localStorage.getItem('proofs') || '[]');

  const updatedProofs = [...proofs, ...proofsToAdd];
  window.localStorage.setItem('proofs', JSON.stringify(updatedProofs));
}

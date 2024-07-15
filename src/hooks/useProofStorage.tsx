import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Proof } from '@cashu/cashu-ts';
import { useCashuContext } from '@/contexts/cashuContext';

type ProofContextType = {
   balance: number;
   lockBalance: () => void;
   unlockBalance: () => void;
   addProofs: (newProofs: Proof[]) => Promise<void>;
   removeProofs: (proofsToRemove: Proof[]) => Promise<void>;
   getProofsByAmount: (amount: number, keysetId?: string) => Proof[] | null;
   clearProofs: () => Promise<void>;
   getAllProofsByKeysetId: (keysetId: string) => Proof[];
   balanceByWallet: Record<string, number>;
   isLoading: boolean;
};

const ProofContext = createContext<ProofContextType | undefined>(undefined);

const STORAGE_KEY = 'proofs';

class DuplicateProofError extends Error {
   constructor(secret: string) {
      super(`Proof with secret ${secret} already exists`);
      this.name = 'DuplicateProofError';
   }
}

class ProofNotFoundError extends Error {
   constructor(secret: string) {
      super(`Proof with secret ${secret} not found`);
      this.name = 'ProofNotFoundError';
   }
}

const getStoredProofs = (): Proof[] => {
   try {
      const storedProofs = localStorage.getItem(STORAGE_KEY);
      return storedProofs ? JSON.parse(storedProofs) : [];
   } catch (error) {
      console.error('Error reading proofs from localStorage:', error);
      return [];
   }
};

const setStoredProofs = (proofs: Proof[]) => {
   try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proofs));
   } catch (error) {
      console.error('Error writing proofs to localStorage:', error);
   }
};

export const ProofProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
   const [proofs, setProofs] = useState<Proof[]>([]);
   const [balanceByWallet, setBalanceByWallet] = useState<Record<string, number>>({});
   const [isLoading, setIsLoading] = useState(true);
   const [isLocked, setIsLocked] = useState(false);

   // Lock balance when proofs are being added and removed consecutively to avoid flickering
   const [lockedBalance, setLockedBalance] = useState<number | null>(null);

   const { wallets } = useCashuContext();

   useEffect(() => {
      setProofs(getStoredProofs());
      setIsLoading(false);
   }, []);

   const balance = useMemo(() => {
      if (lockedBalance !== null) {
         return lockedBalance;
      } else {
         return proofs.reduce((acc, proof) => acc + proof.amount, 0);
      }
   }, [proofs, lockedBalance]);

   const lockBalance = useCallback(() => {
      setLockedBalance(balance);
   }, [balance]);

   const unlockBalance = useCallback(() => {
      setLockedBalance(null);
   }, []);

   useEffect(() => {
      // Update balance by wallet
      const newBalanceByWallet: Record<string, number> = {};
      const walletIds = Array.from(wallets.keys());
      proofs.forEach(proof => {
         if (!walletIds.includes(proof.id)) {
            return;
         }
         newBalanceByWallet[proof.id] = (newBalanceByWallet[proof.id] || 0) + proof.amount;
      });
      setBalanceByWallet(newBalanceByWallet);
   }, [proofs, wallets]);

   const lockOperation = useCallback(
      async (operation: () => void) => {
         if (isLocked) {
            console.log('Operation is locked, waiting and retrying');
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait and retry
            return lockOperation(operation);
         }
         setIsLocked(true);
         try {
            await operation();
         } finally {
            setIsLocked(false);
         }
      },
      [isLocked],
   );

   const addProofs = useCallback(
      async (newProofs: Proof[]) => {
         await lockOperation(() => {
            setProofs(prevProofs => {
               const existingSecrets = new Set(prevProofs.map(p => p.secret));
               const proofsToAdd = newProofs.filter(proof => {
                  if (existingSecrets.has(proof.secret)) {
                     throw new DuplicateProofError(proof.secret);
                  }
                  return true;
               });
               setStoredProofs([...prevProofs, ...proofsToAdd]);
               return [...prevProofs, ...proofsToAdd];
            });
         });
      },
      [lockOperation],
   );

   const removeProofs = useCallback(
      async (proofsToRemove: Proof[]) => {
         await lockOperation(() => {
            setProofs(prevProofs => {
               const existingSecrets = new Set(prevProofs.map(p => p.secret));
               proofsToRemove.forEach(proof => {
                  if (!existingSecrets.has(proof.secret)) {
                     throw new ProofNotFoundError(proof.secret);
                  }
               });
               const proofsToKeep = prevProofs.filter(proof => !proofsToRemove.includes(proof));
               setStoredProofs(proofsToKeep);
               return proofsToKeep;
            });
         });
      },
      [lockOperation],
   );

   const getProofsByAmount = useCallback(
      (amount: number, keysetId?: string) => {
         const result = [];
         let sum = 0;

         for (const proof of proofs) {
            if (sum >= amount) break;
            if (keysetId && proof.id !== keysetId) continue;
            result.push(proof);
            sum += proof.amount;
         }

         return result.length > 0 && sum >= amount ? result : null;
      },
      [proofs],
   );

   const getAllProofsByKeysetId = useCallback(
      (keysetId: string) => {
         return proofs.filter(proof => proof.id === keysetId);
      },
      [proofs],
   );

   const clearProofs = useCallback(async () => {
      await lockOperation(() => {
         setProofs([]);
      });
   }, [lockOperation]);

   const value = useMemo(
      () => ({
         balance,
         addProofs,
         removeProofs,
         getProofsByAmount,
         clearProofs,
         isLoading,
         getAllProofsByKeysetId,
         balanceByWallet,
         lockBalance,
         unlockBalance,
      }),
      [
         balance,
         addProofs,
         removeProofs,
         getProofsByAmount,
         clearProofs,
         isLoading,
         getAllProofsByKeysetId,
         balanceByWallet,
         lockBalance,
         unlockBalance,
      ],
   );

   return <ProofContext.Provider value={value}>{children}</ProofContext.Provider>;
};

export const useProofStorage = () => {
   const context = useContext(ProofContext);
   if (context === undefined) {
      throw new Error('useProofStorage must be used within a ProofProvider');
   }
   return context;
};

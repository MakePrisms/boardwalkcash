import { Proof, MintKeyset, MintKeys } from '@cashu/cashu-ts';

export interface ProofData {
   proofId: string;
   amount: number;
   secret: string;
   C: string;
   userId: number;
   mintKeysetId: string;
}

export interface NWAEventContent {
   secret: string;
   commands: string[];
   relay?: string;
   lud16?: string;
}

export type Wallet = {
   id: string;
   keys: MintKeys;
   proofs: Proof[];
   url: string;
   active: boolean;
};

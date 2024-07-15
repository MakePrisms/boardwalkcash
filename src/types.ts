import { formatUrl } from '@/utils/url';
import {
   Proof,
   MintKeys,
   MintQuoteResponse,
   MeltQuoteResponse,
   ApiError as CashuApiError,
} from '@cashu/cashu-ts';

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
   isReserve: boolean;
};

export class CashuError extends Error {
   constructor(message: string) {
      super(message);
      this.name = 'CashuError';
   }
}

export class InsufficientBalanceError extends CashuError {
   constructor(mintUrl: string, balance?: number) {
      super(
         `${formatUrl(mintUrl, 15)} has insufficient balance. ${balance ? `$${(balance / 100).toFixed(2)}` : ''}`,
      );
      this.name = 'InsufficientBalanceError';
   }
}

export class TransactionError extends CashuError {
   constructor(txType: string, message?: string) {
      super(`${txType} transaction failed: ${message}`);
      this.name = 'TransactionError';
   }
}

export class ReserveError extends CashuError {
   constructor(message?: string) {
      super(`Reserve error: ${message}`);
      this.name = 'ReserveError';
   }
}

export interface CrossMintQuoteResult {
   mintQuote: MintQuoteResponse;
   meltQuote: MeltQuoteResponse;
   amountToMint: number;
}

export const isCashuApiError = (error: any): error is CashuApiError => {
   if (error.detail && typeof error.detail === 'string') {
      return true;
   }
   if (error.code && typeof error.code === 'number') {
      return true;
   }
   if (error.error && typeof error.error === 'string') {
      return true;
   }
   return false;
};

import { formatUrl } from '@/utils/url';
import {
   Proof,
   MintKeys,
   MintQuoteResponse,
   MeltQuoteResponse,
   ApiError as CashuApiError,
   Token,
} from '@cashu/cashu-ts';
import { Notification } from '@prisma/client';

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

export type PublicContact = {
   /** The pubkey of the contact */
   pubkey: string;

   /** The username of the contact */
   username: string | null;

   /** The date the contact was created */
   createdAt: Date;
};

export type TokenProps = {
   /** raw token */
   token: string;

   /** Total token amount */
   amount: number;

   /** Boardwalk contact token is locked to */
   contact: PublicContact | null;

   /** Tokens mint url */
   mintUrl: string;

   /** Whether or not the token is from the contact's default mint */
   isTrustedMint: boolean | null;
};

export enum NotificationType {
   Token = 'token',
   NewContact = 'new-contact',
   TIP = 'tip',
}

export type MarkNotificationsAsReadRequest = {
   ids: number[];
};

export type UpdateNotificationsResponse = MarkNotificationsAsReadRequest;

export type DeleteNotificationsRequest = {
   ids: number[];
};

export type DeleteNotificationsResponse = {
   ids: number[];
};

export type GetNotificationResponse = Notification & { contact: PublicContact };

export type GetNotificationsResponse = Array<GetNotificationResponse>;

export type NotifyTokenReceivedRequest = {
   token: string;
};

export type LightningTipResponse = {
   invoice: string;
   checkingId: string;
};

export type LightningTipStatusResponse = {
   paid: boolean;
   quoteId: string;
};

export type TokenNotificationData = {
   token: Token;
   rawToken: string;
   contact: PublicContact | null;
   isTip: boolean;
   timeAgo: string;
   tokenState: 'claimed' | 'unclaimed';
};

export type ContactNotificationData = {
   id: number;
   contact: PublicContact;
   contactIsAdded: boolean;
   timeAgo: string;
};

export type NotificationWithData = Notification & {
   processedData: TokenNotificationData | ContactNotificationData;
};

export const isTokenNotification = (
   data: TokenNotificationData | ContactNotificationData,
): data is TokenNotificationData => {
   if ('token' in data || 'rawToken' in data) {
      return true;
   }
   return false;
};

export const isContactNotification = (
   data: TokenNotificationData | ContactNotificationData,
): data is ContactNotificationData => {
   if ('contactIsAdded' in data) {
      return true;
   }
   return false;
};

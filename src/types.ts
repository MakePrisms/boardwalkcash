import { formatUrl } from '@/utils/url';
import {
   Proof,
   MintKeys,
   MintQuoteResponse,
   MeltQuoteResponse,
   ApiError as CashuApiError,
   Token,
   MintQuoteState,
} from '@cashu/cashu-ts';
import { MintlessTransaction, Notification, Token as TokenPrisma } from '@prisma/client';
import { NextApiRequest } from 'next';
import { formatUnit } from './utils/formatting';

export interface ProofData {
   proofId: string;
   amount: number;
   secret: string;
   C: string;
   userId: number;
   mintKeysetId: string;
   unit: 'usd' | 'sat';
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
   constructor(unit: Currency, balance: number, tryingToSend: number) {
      super(
         `Your main ${unit === 'usd' ? 'USD' : 'BTC'} wallet has insufficient balance. ${formatUnit(
            balance,
            unit,
         )} available. ${formatUnit(tryingToSend, unit)} needed.`,
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

export class AlreadyClaimedError extends CashuError {
   constructor(message?: string) {
      super(`eCash already claimed`);
      this.name = 'AlreadyClaimedError';
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

   /** The lud16 of the contact */
   lud16: string | null;

   /** Default mint url of the contact */
   defaultMintUrl: string | null;

   /** Unit of proofs this user uses */
   defaultUnit: 'usd' | 'sat';

   mintlessReceive: boolean;
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

   /** Gift asset */
   gift?: GiftAsset;
};

export enum NotificationType {
   Token = 'token',
   NewContact = 'new-contact',
   TIP = 'tip',
   Gift = 'gift', // TODO: add this to notifications
   MintlessTransaction = 'mintless-transaction',
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

export type GetNotificationResponse = Notification & {
   contact: PublicContact;
   token: TokenPrisma | null;
   mintlessTransaction: MintlessTransaction | null;
};

export type GetNotificationsResponse = Array<GetNotificationResponse>;

export type NotifyTokenReceivedRequest = {
   token: string;
   txid?: string;
};

export type LightningTipResponse = {
   invoice: string;
   checkingId: string;
};

export type LightningTipStatusResponse = {
   paid: boolean;
   quoteId: string;
   token?: string;
};

export type TokenNotificationData = {
   token: Token;
   rawToken: string;
   contact: PublicContact | null;
   isTip: boolean;
   timeAgo: string;
   tokenState: 'claimed' | 'unclaimed';
   gift: GiftAsset | null;
   isFee: boolean;
   type: NotificationType.Token;
};

export type ContactNotificationData = {
   id: number;
   contact: PublicContact;
   contactIsAdded: boolean;
   timeAgo: string;
   type: NotificationType.NewContact;
};

export type MintlessTransactionNotificationData = {
   id: string;
   amount: number;
   unit: Currency;
   contact?: PublicContact; // TODO should be required
   isFee: boolean;
   timeAgo: string;
   gift: GiftAsset | null;
   type: NotificationType.MintlessTransaction;
};

export type NotificationWithData = Notification & {
   processedData:
      | TokenNotificationData
      | ContactNotificationData
      | MintlessTransactionNotificationData;
};

export const isTokenNotification = (
   data: TokenNotificationData | ContactNotificationData | MintlessTransactionNotificationData,
): data is TokenNotificationData => {
   if ('token' in data || 'rawToken' in data) {
      return true;
   }
   return false;
};

export const isContactNotification = (
   data: TokenNotificationData | ContactNotificationData | MintlessTransactionNotificationData,
): data is ContactNotificationData => {
   if ('contactIsAdded' in data) {
      return true;
   }
   return false;
};

export const isMintlessTransactionNotification = (
   data: NotificationWithData['processedData'],
): data is MintlessTransactionNotificationData => {
   if ('type' in data && data.type === NotificationType.MintlessTransaction) {
      return true;
   }
   return false;
};

export type PostTokenRequest = {
   token: string;
   giftId: number | null;
   createdByPubkey?: string;
   isFee?: boolean;
};

export type PostTokenResponse = {
   txid: string;
};

export type GetTokenResponse = {
   token: string;
   giftId: number | null;
};

export type GetAllGiftsResponse = {
   gifts: (GiftAsset & { campaignId?: number })[];
};

export type GetGiftResponse = GiftAsset & { campaignId?: number };

export type GiftFee = {
   /* fee amount relative to rest of the splits */
   weight: number;

   /* boardwalk pubkey to send fee to */
   recipient: string;
};

export interface GiftAsset {
   id: number;
   amount: number;
   unit: Currency;
   name: string;
   selectedSrc: string;
   unselectedSrc: string;
   description: string | null;
   creatorPubkey: string | null;
   campaingId?: number;
   fee?: number;
   splits?: GiftFee[];
}

export interface InvoicePollingRequest {
   pubkey: string;
   amount: number;
   keysetId: string;
   mintUrl: string;
   giftId: number | null;
   fee?: number;
}

export type GiftMetrics = {
   total: number;
   giftCount: { [giftName: string]: number };
   totalAmountCents: number;
   username: string;
};

export interface LeaderboardResponse {
   [timePeriod: string]: {
      // senderMetrics: Record<string, GiftMetrics>;
      receiverMetrics: Record<string, GiftMetrics>;
      userData?: {
         sent: GiftMetrics;
         received: GiftMetrics;
      };
   };
}

export interface GenerateNostrOtpRequest {
   nostrPubkey: string;
}

export interface VerifyNostrOtpRequest {
   otp: string;
}

export interface VerifyNostrOtpResponse {
   error?: string;
   nostrPubkey?: string;
}

export interface DiscoverContactsResponse {
   users: {
      pubkey: string;
      username: string | null;
      nostrPubkey: string;
      lud16: string | null;
      defaultMintUrl: string | null;
      mintlessReceive: boolean;
      defaultUnit: 'usd' | 'sat';
   }[];
}

export class NostrError extends Error {
   constructor(message: string) {
      super(message);
      this.name = 'NostrError';
   }
}

export type AuthenticatedRequest = NextApiRequest & {
   authenticatedPubkey?: string;
};

export type PostSingleGiftCampaignSendRequest = {
   campaignId: number;
   recipientPubkey: string;
};

export type PostSendGiftResponse = {
   txid: string;
   token: string;
};

export type PayInvoiceResponse =
   | {
        preimage: string | null; // not all pay invoice responses have a preimage, but they SHOULD
        amountUsd: number;
        feePaid: number;
     }
   | undefined;

export type MintlessTransactionRequest = {
   giftId: number | null;
   amount: number;
   recipientPubkey: string;
   createdByPubkey: string;
   isFee: boolean;
};

export type MintlessTransactionResponse = {
   id: string;
   notificationId: string;
};

export enum Currency {
   USD = 'usd',
   SAT = 'sat',
}

export type GetPaymentRequestResponse = {
   /* encoded payment request */
   pr: string;

   /* payment request id */
   id: string;
};

export type CheckPaymentRequestResponse = {
   paid: boolean;
   token?: string;
   id: string;
   createdAt: Date;
   updatedAt: Date;
};

export type PendingMintQuote = MintQuoteResponse & { amount: number; keysetId: string };

export type MintQuoteStateExt = MintQuoteState | 'EXPIRED';

// a hook for making api requests to this app

import { PostMintQuoteApiResponse } from '@/pages/api/quotes/mint';
import { PollingApiResponse } from '@/pages/api/invoice/polling/[slug]';
import { NDKEvent, NDKKind, NDKPrivateKeySigner, NostrEvent } from '@nostr-dev-kit/ndk';
import { calculateSha256 } from './crypto';
import { UserWithContacts } from '@/pages/api/users/[pubkey]';
import { Proof } from '@prisma/client';
import { ContactData } from '@/lib/userModels';
import {
   Currency,
   GetTokenResponse,
   LightningTipResponse,
   LightningTipStatusResponse,
   PostTokenRequest,
   PostTokenResponse,
} from '@/types';

export class HttpResponseError extends Error {
   status: number;
   constructor(message: string, status: number) {
      super(message);
      this.status = status;
   }
}

const generateNip98Header = async (
   requestUrl: string,
   httpMethod: string,
   blob: Blob | undefined,
): Promise<string> => {
   const privkey = localStorage.getItem('privkey');
   if (!privkey) throw new Error('No privkey found');

   const event = new NDKEvent(undefined, {
      kind: NDKKind.HttpAuth,
      tags: [
         ['u', requestUrl],
         ['method', httpMethod],
      ],
   } as NostrEvent);

   if (['POST', 'PUT', 'PATCH'].includes(httpMethod) && blob) {
      const sha256Hash = await calculateSha256(blob);
      event.tags.push(['payload', sha256Hash]);
   }

   await event.sign(new NDKPrivateKeySigner(privkey));
   const encodedEvent = btoa(JSON.stringify(event.rawEvent()));
   return `Nostr ${encodedEvent}`;
};

export const request = async <T>(url: string, method: string, body?: any): Promise<T> => {
   const response = await fetch(url, {
      method,
      body: JSON.stringify(body),
      headers: {
         'Content-Type': 'application/json',
      },
   });
   if (!response.ok) {
      throw new HttpResponseError(response.statusText, response.status);
   } else if (response.status === 204) {
      // no content breaks the json parsing
      return undefined as unknown as T;
   } else {
      return response.json();
   }
};

export const authenticatedRequest = async <T>(
   url: string,
   method: string,
   body?: any,
): Promise<T> => {
   const token = await generateNip98Header(url, method, undefined);
   const headers = {
      'Content-Type': 'application/json',
      Authorization: token,
   };
   const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
   });
   if (!response.ok) {
      try {
         const errorMessage = await response.text();
         const msg = JSON.parse(errorMessage).message || errorMessage;
         throw new HttpResponseError(msg || response.statusText, response.status);
      } catch (e) {
         throw new HttpResponseError('failed to parse error message', response.status);
      }
   } else if (response.status === 204) {
      // no content breaks the json parsing
      return undefined as unknown as T;
   } else {
      return response.json();
   }
};

export const postUserMintQuote = async (
   pubkey: string,
   quoteId: string,
   request: string,
   mintUrl: string,
   keysetId: string,
) => {
   return await authenticatedRequest<PostMintQuoteApiResponse>(`/api/quotes/mint`, 'POST', {
      pubkey,
      quoteId,
      request,
      mintUrl,
      keysetId,
   });
};

export const pollForInvoicePayment = async (
   pubkey: string,
   quote: string,
   amount: number,
   mintUrl: string,
   keysetId: string,
) => {
   return await authenticatedRequest<PollingApiResponse>(`/api/invoice/polling/${quote}`, 'POST', {
      pubkey,
      amount,
      mintUrl,
      keysetId,
   });
};

export const fetchUser = async (pubkey: string) => {
   return await authenticatedRequest<UserWithContacts>(`/api/users/${pubkey}`, 'GET', undefined);
};

export const updateUser = async (
   pubkey: string,
   updates: Partial<UserWithContacts & { defaultKeysetId?: string }>,
) => {
   return await authenticatedRequest<UserWithContacts>(`/api/users/${pubkey}`, 'PUT', updates);
};

export const createUser = async (
   pubkey: string,
   username: string,
   mintUrl: string,
   defaultUnit: Currency,
) => {
   return await authenticatedRequest<UserWithContacts>(`/api/users`, 'POST', {
      pubkey,
      username,
      mintUrl,
      defaultUnit,
   });
};

export const addContactRequest = async (pubkey: string, contact: ContactData) => {
   return await authenticatedRequest<ContactData>(`/api/users/${pubkey}`, 'PUT', contact);
};

export const deleteProofById = async (proofId: number) => {
   console.log('deleting proof', proofId);
   return await authenticatedRequest<undefined>(`/api/proofs/${proofId}`, 'DELETE');
};

export const getProofsFromServer = async (pubkey: string) => {
   return await authenticatedRequest<{
      proofs: (Proof & { MintKeyset: { unit: 'usd' | 'sat' } })[];
      receiving: boolean;
   }>(`/api/proofs/${pubkey}`, 'GET', undefined);
};

export const getInvoiceForTip = async (
   pubkey: string,
   amount: number,
   opts?: {
      gift?: string;
      fee?: number;
      unit: Currency;
   },
) => {
   return await request<LightningTipResponse>(
      `/api/tip/${pubkey}?amount=${amount}&unit=${opts?.unit || Currency.USD}${opts?.gift ? `&gift=${opts.gift}` : ''}${opts?.fee ? `&fee=${opts.fee}` : ''}`,
      'GET',
      undefined,
   );
};

export const getTipStatus = async (quoteId: string) => {
   return await request<LightningTipStatusResponse>(
      `/api/tip/status?quoteId=${quoteId}`,
      'GET',
      undefined,
   );
};

export const postTokenToDb = async (token: string, gift?: string, isFee?: boolean) => {
   console.log('posting token to db', token);
   const pubkey = window.localStorage.getItem('pubkey');
   return (
      await request<PostTokenResponse>(`/api/token`, 'POST', {
         token,
         gift,
         isFee,
         createdByPubkey: pubkey,
      } as PostTokenRequest)
   ).txid;
};

export const getTokenFromDb = async (txid: string) => {
   return await request<GetTokenResponse>(`/api/token/${txid}`, 'GET', undefined);
};

export const getInvoiceForLNReceive = async (pubkey: string, amount: number, keysetId: string) => {
   return await authenticatedRequest<LightningTipResponse>(
      `/api/users/${pubkey}/receive?amount=${amount}&keysetId=${keysetId}`,
      'GET',
      undefined,
   );
};

export const getInvoiceStatus = async (pubkey: string, checkingId: string) => {
   return await authenticatedRequest<LightningTipStatusResponse>(
      `/api/users/${pubkey}/receive/${checkingId}`,
      'GET',
      undefined,
   );
};

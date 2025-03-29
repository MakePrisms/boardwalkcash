import { createClient } from '@supabase/supabase-js';
import type { Database as DatabaseGenerated } from 'supabase/database.types';
import type { MergeDeep } from 'type-fest';
import type { Currency, CurrencyUnit } from '~/lib/money';
import type { AccountType } from '../accounts/account';
import { supabaseSessionStore } from './supabse-session-store';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not set');
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not set');
}

type CashuReceiveQuotePaymentResult = {
  updated_quote: BoardwalkDbCashuReceiveQuote;
  updated_account: BoardwalkDbAccount;
};

// Use when you need to fix/improve generated types
// See https://supabase.com/docs/guides/api/rest/generating-types#helper-types-for-tables-and-joins
type Database = MergeDeep<
  DatabaseGenerated,
  {
    wallet: {
      Tables: {
        users: {
          Row: {
            default_currency: Currency;
          };
          Insert: {
            default_currency?: Currency;
          };
          Update: {
            default_currency?: Currency;
          };
        };
        accounts: {
          Row: {
            currency: Currency;
            type: AccountType;
          };
          Insert: {
            currency: Currency;
            type: AccountType;
          };
          Update: {
            currency?: Currency;
            type?: AccountType;
          };
        };
        cashu_receive_quotes: {
          Row: {
            currency: Currency;
            unit: CurrencyUnit;
          };
          Insert: {
            currency: Currency;
            unit: CurrencyUnit;
          };
          Update: {
            currency?: Currency;
            unit?: CurrencyUnit;
          };
        };
        cashu_token_swaps: {
          Row: {
            currency: Currency;
            unit: CurrencyUnit;
          };
          Insert: {
            currency: Currency;
            unit: CurrencyUnit;
          };
          Update: {
            currency?: Currency;
            unit?: CurrencyUnit;
          };
        };
      };
      Functions: {
        upsert_user_with_accounts: {
          Args: {
            p_email: string | null;
          };
          Returns: BoardwalkDbUser & {
            accounts: BoardwalkDbAccount[];
          };
        };
        process_cashu_receive_quote_payment: {
          Returns: CashuReceiveQuotePaymentResult;
        };
        create_token_swap: {
          Returns: BoardwalkDbCashuTokenSwap;
        };
        complete_token_swap: {
          Returns: null;
        };
      };
      CompositeTypes: {
        cashu_receive_quote_payment_result: CashuReceiveQuotePaymentResult;
      };
    };
  }
>;

export const boardwalkDb = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    accessToken: () =>
      supabaseSessionStore
        .getState()
        .getJwtWithRefresh()
        .then((jwt) => jwt ?? ''),
    db: {
      schema: 'wallet',
    },
  },
);

export type BoardwalkDb = typeof boardwalkDb;

export type BoardwalkDbUser = Database['wallet']['Tables']['users']['Row'];
export type BoardwalkDbAccount =
  Database['wallet']['Tables']['accounts']['Row'];
export type BoardwalkDbCashuReceiveQuote =
  Database['wallet']['Tables']['cashu_receive_quotes']['Row'];
export type BoardwalkDbCashuTokenSwap =
  Database['wallet']['Tables']['cashu_token_swaps']['Row'];

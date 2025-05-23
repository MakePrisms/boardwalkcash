import { createClient } from '@supabase/supabase-js';
import type { Database as DatabaseGenerated } from 'supabase/database.types';
import type { MergeDeep } from 'type-fest';
import type { Currency, CurrencyUnit } from '~/lib/money';
import type { AccountType } from '../accounts/account';
import type { CashuTokenSwap } from '../receive/cashu-token-swap';
import type { CashuSendSwap } from '../send/cashu-send-swap';
import type { SerializedOutputData } from '../send/cashu-send-swap-repository';
import type { Transaction } from '../transactions/transaction';
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
  updated_quote: AgicashDbCashuReceiveQuote;
  updated_account: AgicashDbAccount;
};

type CreateCashuSendQuoteResult = {
  created_quote: AgicashDbCashuSendQuote;
  updated_account: AgicashDbAccount;
};

type UpdateCashuSendQuoteResult = {
  updated_quote: AgicashDbCashuSendQuote;
  updated_account: AgicashDbAccount;
};

// Use when you need to fix/improve generated types
// See https://supabase.com/docs/guides/api/rest/generating-types#helper-types-for-tables-and-joins
export type Database = MergeDeep<
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
            type: CashuTokenSwap['type'];
          };
          Insert: {
            currency: Currency;
            unit: CurrencyUnit;
            type: CashuTokenSwap['type'];
          };
          Update: {
            currency?: Currency;
            unit?: CurrencyUnit;
            type?: CashuTokenSwap['type'];
          };
        };
        cashu_send_quotes: {
          Row: {
            currency: Currency;
            unit: CurrencyUnit;
            currency_requested: Currency;
          };
          Insert: {
            currency: Currency;
            unit: CurrencyUnit;
            currency_requested: Currency;
          };
          Update: {
            currency?: Currency;
            unit?: CurrencyUnit;
            currency_requested?: Currency;
          };
        };
        cashu_send_swaps: {
          Row: {
            keep_output_data: SerializedOutputData[];
            send_output_data: SerializedOutputData[];
            state: CashuSendSwap['state'];
            currency: Currency;
            unit: CurrencyUnit;
          };
          Insert: {
            keep_output_data: SerializedOutputData[];
            send_output_data: SerializedOutputData[];
            state: CashuSendSwap['state'];
            currency: Currency;
            unit: CurrencyUnit;
          };
          Update: {
            keep_output_data?: SerializedOutputData[];
            send_output_data?: SerializedOutputData[];
            state?: CashuSendSwap['state'];
            currency?: Currency;
            unit?: CurrencyUnit;
          };
        };
        transactions: {
          Row: {
            currency: Currency;
            unit: CurrencyUnit;
            direction: Transaction['direction'];
            type: Transaction['type'];
            state: Transaction['state'];
          };
        };
      };
      Functions: {
        upsert_user_with_accounts: {
          Args: {
            p_email: string | null;
          };
          Returns: AgicashDbUser & {
            accounts: AgicashDbAccount[];
          };
        };
        process_cashu_receive_quote_payment: {
          Returns: CashuReceiveQuotePaymentResult;
        };
        create_cashu_token_swap: {
          Returns: AgicashDbCashuTokenSwap;
        };
        create_cashu_send_quote: {
          Returns: CreateCashuSendQuoteResult;
        };
        complete_cashu_send_quote: {
          Returns: UpdateCashuSendQuoteResult;
        };
        expire_cashu_send_quote: {
          Returns: UpdateCashuSendQuoteResult;
        };
        fail_cashu_send_quote: {
          Returns: UpdateCashuSendQuoteResult;
        };
        create_cashu_send_swap: {
          Returns: AgicashDbCashuSendSwap;
        };
      };
      CompositeTypes: {
        cashu_receive_quote_payment_result: CashuReceiveQuotePaymentResult;
        create_cashu_send_quote_result: CreateCashuSendQuoteResult;
        update_cashu_send_quote_result: UpdateCashuSendQuoteResult;
      };
    };
  }
>;

export const agicashDb = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  accessToken: () =>
    supabaseSessionStore
      .getState()
      .getJwtWithRefresh()
      .then((jwt) => jwt ?? ''),
  db: {
    schema: 'wallet',
  },
});

export type AgicashDb = typeof agicashDb;

export type AgicashDbUser = Database['wallet']['Tables']['users']['Row'];
export type AgicashDbAccount = Database['wallet']['Tables']['accounts']['Row'];
export type AgicashDbCashuReceiveQuote =
  Database['wallet']['Tables']['cashu_receive_quotes']['Row'];
export type AgicashDbCashuTokenSwap =
  Database['wallet']['Tables']['cashu_token_swaps']['Row'];
export type AgicashDbCashuSendQuote =
  Database['wallet']['Tables']['cashu_send_quotes']['Row'];
export type AgicashDbTransaction =
  Database['wallet']['Tables']['transactions']['Row'];
export type AgicashDbContact = Database['wallet']['Tables']['contacts']['Row'];
export type AgicashDbCashuSendSwap =
  Database['wallet']['Tables']['cashu_send_swaps']['Row'];

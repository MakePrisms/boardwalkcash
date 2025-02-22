import { createClient } from '@supabase/supabase-js';
import type { Database as DatabaseGenerated } from 'supabase/database.types';
import type { MergeDeep } from 'type-fest';
import type { Currency } from '~/lib/money';
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
      };
      Functions: {
        upsert_user_with_accounts: {
          Args: {
            email: string | null;
          };
          Returns: BoardwalkDbUser & {
            accounts: BoardwalkDbAccount[];
          };
        };
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

import { createClient } from '@supabase/supabase-js';
import type { Database } from 'supabase/database.types';
import { supabaseSessionStore } from './supabse-session-store';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not set');
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not set');
}

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

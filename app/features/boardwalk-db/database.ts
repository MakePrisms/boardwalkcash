import { createClient } from '@supabase/supabase-js';
import type { Database } from 'supabase/database.types';
import { supabaseSessionStore } from './supabse-session-store';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

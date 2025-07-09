import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';
import { agicashDb } from './database';

type SupabaseSession = {
  jwt: string | null;
  getJwt: (() => Promise<string>) | null;
  setJwtGetter: (getJwt: () => Promise<string>) => void;
  getJwtWithRefresh: () => Promise<string | null>;
  clear: () => void;
};

export const supabaseSessionStore = create<SupabaseSession>((set, get) => ({
  jwt: null,
  getJwt: null,
  setJwtGetter: (getJwt) => {
    set({ getJwt });
  },
  getJwtWithRefresh: async (): Promise<string | null> => {
    const { jwt: currentJwt, getJwt } = get();
    if (currentJwt) {
      const decoded = jwtDecode(currentJwt);
      const expiration = decoded?.exp;
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const fiveSecondsFromNow = nowInSeconds + 5;

      if (expiration && expiration > fiveSecondsFromNow) {
        return currentJwt;
      }
    }

    if (!getJwt) {
      console.warn(
        'No jwt getter found. Returning null for supabase session jwt',
      );
      return null;
    }

    const jwt = await getJwt();

    set({ jwt });
    // We need to set this manually on refresh becuuse otherwise the realtime connection will use the old jwt and connection will be closed
    // I don't know why Supabase donesn't do that internally when accessToken method passed to the client returns a new jwt
    agicashDb.realtime.setAuth(jwt);

    return jwt;
  },
  clear: () => {
    set({ jwt: null });
  },
}));

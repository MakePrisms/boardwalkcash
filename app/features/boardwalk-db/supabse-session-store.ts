import ky from 'ky';
import { create } from 'zustand';

type SupabaseSession = {
  payload: { sub: string; iat?: number; exp?: number } | null;
  jwt: string | null;
  setJwtPayload: (payload: { sub: string }) => void;
  getJwtWithRefresh: () => Promise<string | null>;
  clear: () => void;
};

const signJwt = async (payload: {
  sub: string;
  iat: number;
  exp: number;
  role: string;
}): Promise<string> => {
  // TODO: use the token from OS here and validate it in the endpoint to make sure only logged in users can call that endpoint.
  // Otherwise anyone could create this jwt and access supabse db.
  const response = await ky
    .post<{ jwt: string }>('/api/sign', {
      json: payload,
    })
    .json();
  return response.jwt;
};

export const supabaseSessionStore = create<SupabaseSession>((set, get) => ({
  payload: null,
  jwt: null,
  setJwtPayload: (payload: { sub: string }) => {
    set({ payload });
  },
  getJwtWithRefresh: async (): Promise<string | null> => {
    const { jwt: currentJwt, payload: currentPayload } = get();
    if (
      currentJwt &&
      currentPayload?.exp &&
      currentPayload.exp > Math.floor(Date.now() / 1000) + 5
    ) {
      return currentJwt;
    }

    if (!currentPayload?.sub) {
      console.warn(
        'No sub found in payload. Returning null for supabase session jwt',
      );
      return null;
    }

    const iat = Math.floor(Date.now() / 1000);
    const oneHourInSeconds = 60 * 60;
    const exp = iat + oneHourInSeconds;
    const payload = {
      sub: currentPayload?.sub,
      iat,
      exp,
      role: 'authenticated',
    };
    const jwt = await signJwt(payload);

    set({ payload, jwt });

    return jwt;
  },
  clear: () => {
    set({ payload: null, jwt: null });
  },
}));

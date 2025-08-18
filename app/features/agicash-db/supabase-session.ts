import { generateThirdPartyToken } from '@opensecret/react';
import type { FetchQueryOptions } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { getQueryClient } from '~/query-client';

const queryClient = getQueryClient();

export const supabaseSessionTokenQuery = (): FetchQueryOptions<string> => ({
  queryKey: ['supabase-session-token'],
  queryFn: async () => {
    const response = await generateThirdPartyToken();
    return response.token;
  },
  staleTime: ({ state: { data } }) => {
    if (!data) {
      return 0;
    }

    const decoded = jwtDecode(data);

    if (!decoded.exp) {
      return 0;
    }

    const fiveSecondsBeforeExpirationInMs = (decoded.exp - 5) * 1000;
    const now = Date.now();

    const msToExpiration = fiveSecondsBeforeExpirationInMs - now;

    return Math.max(msToExpiration, 0);
  },
});

export const getSupabaseSessionToken = () =>
  queryClient.fetchQuery(supabaseSessionTokenQuery());

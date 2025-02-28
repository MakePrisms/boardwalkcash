import { type LoaderFunctionArgs, json } from '@remix-run/node';
import {
  useLoaderData,
  useNavigation,
  useSearchParams,
} from '@remix-run/react';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Input } from '~/components/ui/input';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not set');
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not set');
}

export const boardwalkDbPublic = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'wallet' },
});

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type SearchResult = {
  username: string;
  id: string;
};

type LoaderData = {
  results: SearchResult[];
  error?: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';

  if (!query || query.length < 3) {
    return json<LoaderData>({ results: [] });
  }

  console.log('Searching with query:', query);

  const { data, error } = await boardwalkDbPublic.rpc(
    'search_for_user_by_username',
    {
      query,
    },
  );

  console.log('Raw response data:', data);
  console.log('Response type:', typeof data);
  if (Array.isArray(data)) {
    console.log('Array length:', data.length);
    console.log('First item:', data[0]);
  }

  if (error) {
    console.error('Search error:', error);
    return json<LoaderData>({ results: [], error: 'Failed to search users' });
  }

  // Transform the data to match our expected format
  const results = Array.isArray(data)
    ? data.map((item) => ({
        id: item.id,
        username: item.username,
      }))
    : [];

  console.log('Processed results:', results);

  return json<LoaderData>({ results });
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const debouncedQuery = useDebounce(query, 300);
  const navigation = useNavigation();
  const { results, error } = useLoaderData<typeof loader>();

  useEffect(() => {
    setSearchParams((prev) => {
      if (!debouncedQuery || debouncedQuery.length < 3) {
        prev.delete('q');
      } else {
        prev.set('q', debouncedQuery);
      }
      return prev;
    });
  }, [debouncedQuery, setSearchParams]);

  const isSearching = navigation.state === 'loading';
  const showMinCharactersMessage = query.length > 0 && query.length < 3;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 font-bold text-2xl">Search Users</h1>

      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Start typing a username..."
        />
        {isSearching && (
          <div className="absolute top-2.5 right-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
      </div>

      {showMinCharactersMessage && (
        <div className="mt-4 text-center text-gray-500">
          Please enter at least 3 characters to search
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-2">
        {results.map((user) => (
          <div
            key={user.id}
            className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
          >
            <p className="font-medium">{user.username}</p>
          </div>
        ))}
        {query.length >= 3 && results.length === 0 && !isSearching && (
          <p className="py-4 text-center text-gray-500">
            No users found matching "{query}"
          </p>
        )}
      </div>
    </div>
  );
}

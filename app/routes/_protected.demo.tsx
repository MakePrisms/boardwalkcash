import type {
  QueryData,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { agicashDb } from '~/features/agicash-db/database';
import { useUser } from '~/features/user/user-hooks';

const accountsQuery = agicashDb.from('accounts').select();
type Accounts = QueryData<typeof accountsQuery>;
type Account = Accounts[number];

export default function Demo() {
  const user = useUser();
  const [accounts, setAccounts] = useState<Accounts>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getAccounts = async () => {
      if (!user.id) return;

      const { data, error } = await accountsQuery;

      if (error) {
        setError(error.message);
      } else {
        setAccounts(data);
      }
    };

    getAccounts();
  }, [user.id]);

  useEffect(() => {
    const channel = agicashDb
      .channel('accounts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'wallet',
          table: 'accounts',
        },
        (payload: RealtimePostgresChangesPayload<Account>) => {
          if (payload.eventType === 'DELETE') {
            setAccounts((prev) =>
              prev.filter((account) => account.id !== payload.old.id),
            );
          } else if (payload.eventType === 'INSERT') {
            setAccounts((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setAccounts((prev) =>
              prev.map((account) =>
                account.id === payload.new.id ? payload.new : account,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div>
      <h1>This is Demo page</h1>
      {error ? (
        <div className="mt-4">{error}</div>
      ) : (
        <div className="mt-4">
          {accounts.map((account) => (
            <div key={account.id}>
              <pre>{JSON.stringify(account, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
